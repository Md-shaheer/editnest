from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from rembg import remove
from PIL import Image
import io

app = FastAPI(title="BG Remover API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE = 10 * 1024 * 1024

@app.get("/")
def root():
    return {"status": "ok", "message": "BG Remover API is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")
    try:
        input_image = Image.open(io.BytesIO(contents))
        input_image.verify()
        input_image = Image.open(io.BytesIO(contents))
        output_bytes = remove(contents)
        output_image = Image.open(io.BytesIO(output_bytes))
        png_buffer = io.BytesIO()
        output_image.save(png_buffer, format="PNG")
        png_buffer.seek(0)
        return Response(
            content=png_buffer.read(),
            media_type="image/png",
            headers={"Content-Disposition": "attachment; filename=removed_bg.png"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")