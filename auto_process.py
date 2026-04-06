import os
import requests

# If your backend is deployed, change this to "https://editnest-api.onrender.com/remove-bg"
API_URL = "http://localhost:8000/remove-bg"
API_KEY = "editnest-automation-key-123"

INPUT_DIR = "input_images"
OUTPUT_DIR = "output_images"

# Create directories if they don't exist
os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

def process_bulk_images():
    images = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    
    if not images:
        print(f"No images found in '{INPUT_DIR}'. Please add some images and run again.")
        return

    print(f"Found {len(images)} images to process...")

    for filename in images:
        input_path = os.path.join(INPUT_DIR, filename)
        output_path = os.path.join(OUTPUT_DIR, f"{os.path.splitext(filename)[0]}_nobg.png")
        
        print(f"Processing: {filename}...")
        
        with open(input_path, "rb") as f:
            response = requests.post(
                API_URL,
                headers={"X-API-Key": API_KEY},
                files={"file": f}
            )
            
        if response.status_code == 200:
            with open(output_path, "wb") as out_f:
                out_f.write(response.content)
            print(f"  ✅ Saved to {output_path}")
        else:
            print(f"  ❌ Failed: {response.text}")

if __name__ == "__main__":
    process_bulk_images()