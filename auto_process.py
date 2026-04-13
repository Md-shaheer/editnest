import os
import mimetypes

import requests

API_URL = "http://localhost:8000/remove-bg"
API_KEY = "editnest-automation-key-123"

INPUT_DIR = "input_images"
OUTPUT_DIR = "output_images"
SUPPORTED_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


def get_input_images():
    return [
        file_name
        for file_name in os.listdir(INPUT_DIR)
        if file_name.lower().endswith(SUPPORTED_EXTENSIONS)
    ]


def process_bulk_images():
    image_names = get_input_images()

    if not image_names:
        print(f"No images found in '{INPUT_DIR}'. Add some files and run the script again.")
        return

    print(f"Found {len(image_names)} image(s) to process.")

    for file_name in image_names:
        input_path = os.path.join(INPUT_DIR, file_name)
        output_path = os.path.join(
            OUTPUT_DIR,
            f"{os.path.splitext(file_name)[0]}_nobg.png",
        )

        print(f"Processing: {file_name}")

        with open(input_path, "rb") as image_file:
            content_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"
            response = requests.post(
                API_URL,
                headers={"X-API-Key": API_KEY},
                files={"file": (file_name, image_file, content_type)},
                timeout=120,
            )

        if response.status_code == 200:
            with open(output_path, "wb") as output_file:
                output_file.write(response.content)
            print(f"  Saved: {output_path}")
        else:
            print(f"  Failed ({response.status_code}): {response.text}")


if __name__ == "__main__":
    process_bulk_images()
