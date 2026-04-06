from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from PIL import Image
import io
import re
import hashlib
import os
import gc
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Limit thread usage to optimize for the 0.1 CPU constraint
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

from database import get_db, create_tables
from auth import (
    create_user, authenticate_user, create_access_token,
    get_user_by_email, get_user_by_username, decode_token
)

app = FastAPI(title="EditNest API", version="1.0.0")

CACHE_DIR = os.environ.get("CACHE_DIR", "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

DEFAULT_SECRET_API_KEY = "editnest-automation-key-123"
SECRET_API_KEY = os.environ.get("API_KEY")

if not SECRET_API_KEY and not os.environ.get("PORT"):
    SECRET_API_KEY = DEFAULT_SECRET_API_KEY
elif not SECRET_API_KEY:
    print("WARNING: API_KEY is not set. X-API-Key automation access is disabled.")

create_tables()
# Pre-download the rembg model on startup
from rembg import new_session, remove

print("Pre-loading AI model (lightweight version)...")
model_session = new_session("u2netp")
print("AI model loaded!")


def get_allowed_origins():
    origins = ["http://localhost:5173", "http://localhost:3000"]

    frontend_url = os.environ.get("FRONTEND_URL", "").strip()
    if frontend_url:
        origins.append(frontend_url)

    extra_origins = os.environ.get("CORS_ALLOWED_ORIGINS", "")
    origins.extend(origin.strip() for origin in extra_origins.split(",") if origin.strip())

    # Preserve order while removing duplicates.
    return list(dict.fromkeys(origins))


cors_allow_origin_regex = os.environ.get("CORS_ALLOW_ORIGIN_REGEX")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_origin_regex=cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE = int(os.environ.get("MAX_FILE_SIZE_MB", "5")) * 1024 * 1024

# Ensure we only process one image at a time to prevent RAM crashes
processing_semaphore = asyncio.Semaphore(1)
thread_pool = ThreadPoolExecutor(max_workers=1)

# --- Pydantic Models ---
class SignupRequest(BaseModel):
    email: str
    username: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GenerateBgRequest(BaseModel):
    prompt: str
    image_base64: str

# --- Auth Routes ---
@app.post("/auth/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not re.search(r"[A-Za-z]", data.password) or not re.search(r"[0-9]", data.password):
        raise HTTPException(status_code=400, detail="Password must contain at least one letter and one number")
    user = create_user(db, data.email, data.username, data.password)
    token = create_access_token({"sub": user.email})
    return {"token": token, "username": user.username, "email": user.email}

@app.post("/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.email})
    return {"token": token, "username": user.username, "email": user.email}

@app.get("/auth/me")
def get_me(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    email = decode_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"username": user.username, "email": user.email}

# --- Image Routes ---
@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/remove-bg")
async def remove_background(
    file: UploadFile = File(...),
    authorization: str = Header(None),
    x_api_key: str = Header(None),
    db: Session = Depends(get_db)
):
    # Allow machine-to-machine automation via API Key
    is_machine = bool(SECRET_API_KEY) and x_api_key == SECRET_API_KEY
    
    if not is_machine:
        # Fallback to human JWT Authentication
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Please login or provide a valid X-API-Key")
        token = authorization.split(" ")[1]
        email = decode_token(token)
        if not email:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type")
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    # Check if the image has already been processed
    file_hash = hashlib.sha256(contents).hexdigest()
    cache_path = os.path.join(CACHE_DIR, f"{file_hash}_hq.png")
    
    if os.path.exists(cache_path):
        with open(cache_path, "rb") as f:
            return Response(
                content=f.read(),
                media_type="image/png",
                headers={"Content-Disposition": "attachment; filename=removed_bg.png"},
            )

    try:
        input_image = Image.open(io.BytesIO(contents))
        input_image.verify()
        
        def process_image():
            return remove(
                contents, 
                session=model_session,
                post_process_mask=False,
                alpha_matting=False
            )
            
        loop = asyncio.get_running_loop()
        async with processing_semaphore:
            output_bytes = await loop.run_in_executor(thread_pool, process_image)
            
        output_image = Image.open(io.BytesIO(output_bytes))
        png_buffer = io.BytesIO()
        output_image.save(png_buffer, format="PNG", optimize=True, compress_level=9)
        png_data = png_buffer.getvalue()
        
        # Save the result to the cache
        with open(cache_path, "wb") as f:
            f.write(png_data)
            
        return Response(
            content=png_data,
            media_type="image/png",
            headers={"Content-Disposition": "attachment; filename=removed_bg.png"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        # Force garbage collection to keep the memory footprint safely under 512MB
        gc.collect()

@app.post("/generate-bg")
async def generate_background_ai(
    request: GenerateBgRequest,
    authorization: str = Header(None)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Please login to use AI features")
    
    token = authorization.split(" ")[1]
    email = decode_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN")
    if not REPLICATE_API_TOKEN:
        raise HTTPException(status_code=501, detail="Replicate API token not configured in backend.")
        
    try:
        import replicate
        # Ad-inpaint is one excellent model for replacing backgrounds;
        # feel free to swap this with stable diffusion, controlnet, etc.
        output = replicate.run(
            "logerzhu/ad-inpaint:b1c17d148455c1fda435ababe9ab1e03bc0d917cc3cf4251916f22c45c83c7df",
            input={
                "image_path": request.image_base64,
                "prompt": request.prompt
            }
        )
        return {"generated_url": output}
    except ImportError:
        raise HTTPException(status_code=500, detail="Replicate Python package is not installed. Run 'pip install replicate'")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
