from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel
from PIL import Image
import io
import re
import hashlib
import os
import gc
import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Optional

# Limit thread usage to optimize for the 0.1 CPU constraint
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

from database import ActivityEvent, get_db, create_tables
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

class GoogleAuthRequest(BaseModel):
    id_token: str
    username: Optional[str] = None

class GenerateBgRequest(BaseModel):
    prompt: str
    image_base64: str


class ClientEventRequest(BaseModel):
    event: str
    page: Optional[str] = None
    session_id: Optional[str] = None
    details: Optional[dict[str, Any]] = None


ALLOWED_CLIENT_EVENTS = {
    "auth_view",
    "dashboard_view",
    "activity_view",
    "logout",
    "result_view",
    "upload_cancelled",
}


def get_admin_emails():
    raw_admin_emails = os.environ.get("ADMIN_EMAILS", "")
    return {email.strip().lower() for email in raw_admin_emails.split(",") if email.strip()}


def is_admin_email(email: Optional[str]) -> bool:
    return bool(email) and email.lower() in get_admin_emails()


def get_request_ip(request: Request) -> Optional[str]:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def encode_details(details: Optional[dict[str, Any]]) -> Optional[str]:
    if not details:
        return None
    return json.dumps(details, ensure_ascii=True)


def decode_details(details: Optional[str]) -> Optional[dict[str, Any]]:
    if not details:
        return None
    try:
        return json.loads(details)
    except json.JSONDecodeError:
        return {"raw": details}


def resolve_user_from_auth(db: Session, authorization: Optional[str]):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    email = decode_token(token)
    if not email:
        return None
    return get_user_by_email(db, email)


def require_admin_user(db: Session, authorization: Optional[str]):
    user = resolve_user_from_auth(db, authorization)
    if not user or not is_admin_email(user.email):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def safe_log_activity(
    db: Session,
    event: str,
    request: Optional[Request] = None,
    user=None,
    email: Optional[str] = None,
    page: Optional[str] = None,
    session_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
):
    try:
        activity = ActivityEvent(
            user_id=getattr(user, "id", None),
            email=email or getattr(user, "email", None),
            event=event,
            page=page,
            method=request.method if request else None,
            path=str(request.url.path) if request else None,
            ip_address=get_request_ip(request) if request else None,
            user_agent=request.headers.get("user-agent") if request else None,
            session_id=session_id,
            details=encode_details(details),
        )
        db.add(activity)
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"WARNING: failed to write activity log for {event}: {exc}")


def serialize_activity(activity: ActivityEvent):
    return {
        "id": activity.id,
        "email": activity.email,
        "event": activity.event,
        "page": activity.page,
        "method": activity.method,
        "path": activity.path,
        "ip_address": activity.ip_address,
        "session_id": activity.session_id,
        "details": decode_details(activity.details),
        "created_at": activity.created_at.isoformat() if activity.created_at else None,
    }


def build_unique_username(db: Session, preferred_username: Optional[str], email: str) -> str:
    source_value = preferred_username or email.split("@")[0]
    cleaned_value = re.sub(r"[^A-Za-z0-9_]", "", source_value).lower()
    base_username = cleaned_value[:20] or "editnestuser"

    candidate = base_username
    counter = 1

    while get_user_by_username(db, candidate):
        counter += 1
        suffix = str(counter)
        candidate = f"{base_username[: max(1, 20 - len(suffix))]}{suffix}"

    return candidate

# --- Auth Routes ---
@app.post("/auth/signup")
def signup(
    data: SignupRequest,
    request: Request,
    x_session_id: str = Header(None),
    db: Session = Depends(get_db)
):
    if get_user_by_email(db, data.email):
        safe_log_activity(
            db,
            "signup_failed",
            request=request,
            email=data.email,
            session_id=x_session_id,
            details={"reason": "email_exists", "username": data.username},
        )
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_username(db, data.username):
        safe_log_activity(
            db,
            "signup_failed",
            request=request,
            email=data.email,
            session_id=x_session_id,
            details={"reason": "username_taken", "username": data.username},
        )
        raise HTTPException(status_code=400, detail="Username already taken")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not re.search(r"[A-Za-z]", data.password) or not re.search(r"[0-9]", data.password):
        raise HTTPException(status_code=400, detail="Password must contain at least one letter and one number")
    user = create_user(db, data.email, data.username, data.password)
    safe_log_activity(
        db,
        "signup_success",
        request=request,
        user=user,
        session_id=x_session_id,
        details={"username": user.username},
    )
    token = create_access_token({"sub": user.email})
    return {
        "token": token,
        "username": user.username,
        "email": user.email,
        "is_admin": is_admin_email(user.email),
    }


@app.post("/auth/google")
def google_auth(
    data: GoogleAuthRequest,
    request: Request,
    x_session_id: str = Header(None),
    db: Session = Depends(get_db)
):
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
    except ImportError:
        raise HTTPException(status_code=500, detail="Google authentication is not configured on the server")

    try:
        token_payload = google_id_token.verify_firebase_token(
            data.id_token,
            google_requests.Request(),
        )
    except Exception:
        safe_log_activity(
            db,
            "google_login_failed",
            request=request,
            session_id=x_session_id,
            details={"reason": "invalid_google_token"},
        )
        raise HTTPException(status_code=401, detail="Google authentication failed")

    email = token_payload.get("email")
    email_verified = token_payload.get("email_verified")

    if not email or not email_verified:
        safe_log_activity(
            db,
            "google_login_failed",
            request=request,
            email=email,
            session_id=x_session_id,
            details={"reason": "email_not_verified"},
        )
        raise HTTPException(status_code=401, detail="Google account email is not verified")

    user = get_user_by_email(db, email)
    if not user:
        username = build_unique_username(
            db,
            token_payload.get("name") or data.username,
            email,
        )
        generated_password = f"google:{token_payload.get('user_id') or token_payload.get('sub') or email}"
        user = create_user(db, email, username, generated_password)
        safe_log_activity(
            db,
            "google_signup_success",
            request=request,
            user=user,
            session_id=x_session_id,
            details={"username": user.username},
        )

    safe_log_activity(
        db,
        "google_login_success",
        request=request,
        user=user,
        session_id=x_session_id,
        details={"username": user.username},
    )
    token = create_access_token({"sub": user.email})
    return {
        "token": token,
        "username": user.username,
        "email": user.email,
        "is_admin": is_admin_email(user.email),
    }

@app.post("/auth/login")
def login(
    data: LoginRequest,
    request: Request,
    x_session_id: str = Header(None),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, data.email, data.password)
    if not user:
        safe_log_activity(
            db,
            "login_failed",
            request=request,
            email=data.email,
            session_id=x_session_id,
            details={"reason": "invalid_credentials"},
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    safe_log_activity(
        db,
        "login_success",
        request=request,
        user=user,
        session_id=x_session_id,
        details={"username": user.username},
    )
    token = create_access_token({"sub": user.email})
    return {
        "token": token,
        "username": user.username,
        "email": user.email,
        "is_admin": is_admin_email(user.email),
    }

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
    return {
        "username": user.username,
        "email": user.email,
        "is_admin": is_admin_email(user.email),
    }


@app.post("/analytics/track")
def track_client_event(
    data: ClientEventRequest,
    request: Request,
    authorization: str = Header(None),
    x_session_id: str = Header(None),
    db: Session = Depends(get_db)
):
    if data.event not in ALLOWED_CLIENT_EVENTS:
        raise HTTPException(status_code=400, detail="Unsupported analytics event")
    user = resolve_user_from_auth(db, authorization)
    safe_log_activity(
        db,
        data.event,
        request=request,
        user=user,
        page=data.page,
        session_id=data.session_id or x_session_id,
        details=data.details,
    )
    return {"status": "tracked"}


@app.get("/analytics/summary")
def get_analytics_summary(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    require_admin_user(db, authorization)

    total_events = db.query(func.count(ActivityEvent.id)).scalar() or 0
    total_visitors = (
        db.query(func.count(func.distinct(ActivityEvent.session_id)))
        .filter(ActivityEvent.session_id.isnot(None))
        .scalar()
        or 0
    )
    logged_in_users = (
        db.query(func.count(func.distinct(ActivityEvent.email)))
        .filter(ActivityEvent.email.isnot(None))
        .scalar()
        or 0
    )
    total_uploads = (
        db.query(func.count(ActivityEvent.id))
        .filter(ActivityEvent.event == "remove_bg_completed")
        .scalar()
        or 0
    )

    action_counts = [
        {"event": event, "count": count}
        for event, count in (
            db.query(ActivityEvent.event, func.count(ActivityEvent.id))
            .group_by(ActivityEvent.event)
            .order_by(func.count(ActivityEvent.id).desc())
            .all()
        )
    ]

    recent_users = [
        {
            "email": email,
            "event_count": event_count,
            "last_seen": last_seen.isoformat() if last_seen else None,
        }
        for email, event_count, last_seen in (
            db.query(
                ActivityEvent.email,
                func.count(ActivityEvent.id),
                func.max(ActivityEvent.created_at),
            )
            .filter(ActivityEvent.email.isnot(None))
            .group_by(ActivityEvent.email)
            .order_by(func.max(ActivityEvent.created_at).desc())
            .limit(10)
            .all()
        )
    ]

    return {
        "totals": {
            "events": total_events,
            "visitors": total_visitors,
            "logged_in_users": logged_in_users,
            "uploads": total_uploads,
        },
        "action_counts": action_counts,
        "recent_users": recent_users,
    }


@app.get("/analytics/events")
def get_analytics_events(
    limit: int = Query(50, ge=1, le=200),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    require_admin_user(db, authorization)
    events = (
        db.query(ActivityEvent)
        .order_by(ActivityEvent.created_at.desc(), ActivityEvent.id.desc())
        .limit(limit)
        .all()
    )
    return {"events": [serialize_activity(event) for event in events]}

# --- Image Routes ---
@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/remove-bg")
async def remove_background(
    request: Request,
    file: UploadFile = File(...),
    authorization: str = Header(None),
    x_api_key: str = Header(None),
    x_session_id: str = Header(None),
    db: Session = Depends(get_db)
):
    # Allow machine-to-machine automation via API Key
    is_machine = bool(SECRET_API_KEY) and x_api_key == SECRET_API_KEY
    user = None
    
    if not is_machine:
        # Fallback to human JWT Authentication
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Please login or provide a valid X-API-Key")
        token = authorization.split(" ")[1]
        email = decode_token(token)
        if not email:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        user = get_user_by_email(db, email)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type")
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    # Check if the image has already been processed
    file_hash = hashlib.sha256(contents).hexdigest()
    cache_path = os.path.join(CACHE_DIR, f"{file_hash}_hq.png")
    
    if os.path.exists(cache_path):
        safe_log_activity(
            db,
            "remove_bg_completed",
            request=request,
            user=user,
            session_id=x_session_id,
            details={
                "file_name": file.filename,
                "file_size": len(contents),
                "content_type": file.content_type,
                "source": "cache",
                "is_machine": is_machine,
            },
        )
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

        safe_log_activity(
            db,
            "remove_bg_completed",
            request=request,
            user=user,
            session_id=x_session_id,
            details={
                "file_name": file.filename,
                "file_size": len(contents),
                "content_type": file.content_type,
                "source": "processed",
                "is_machine": is_machine,
            },
        )
            
        return Response(
            content=png_data,
            media_type="image/png",
            headers={"Content-Disposition": "attachment; filename=removed_bg.png"},
        )
    except Exception as e:
        safe_log_activity(
            db,
            "remove_bg_failed",
            request=request,
            user=user,
            session_id=x_session_id,
            details={
                "file_name": file.filename,
                "file_size": len(contents),
                "content_type": file.content_type,
                "error": str(e),
                "is_machine": is_machine,
            },
        )
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        # Force garbage collection to keep the memory footprint safely under 512MB
        gc.collect()

@app.post("/generate-bg")
async def generate_background_ai(
    request: Request,
    data: GenerateBgRequest,
    authorization: str = Header(None),
    x_session_id: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Please login to use AI features")
    
    token = authorization.split(" ")[1]
    email = decode_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

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
                "image_path": data.image_base64,
                "prompt": data.prompt
            }
        )
        safe_log_activity(
            db,
            "generate_bg_completed",
            request=request,
            user=user,
            page="result",
            session_id=x_session_id,
            details={"prompt": data.prompt[:200]},
        )
        return {"generated_url": output}
    except ImportError:
        raise HTTPException(status_code=500, detail="Replicate Python package is not installed. Run 'pip install replicate'")
    except Exception as e:
        safe_log_activity(
            db,
            "generate_bg_failed",
            request=request,
            user=user,
            page="result",
            session_id=x_session_id,
            details={"prompt": data.prompt[:200], "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
