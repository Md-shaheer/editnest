export const TRANSPARENT_BACKGROUND = Object.freeze({
  id: "transparent",
  type: "transparent",
  label: "Transparent",
});

export function normalizeBackgroundSelection(background) {
  if (!background) {
    return TRANSPARENT_BACKGROUND;
  }

  if (typeof background === "string") {
    if (background === "transparent") {
      return TRANSPARENT_BACKGROUND;
    }

    return {
      id: `solid:${background}`,
      type: "solid",
      label: "Solid",
      value: background,
    };
  }

  if (background.type === "transparent") {
    return TRANSPARENT_BACKGROUND;
  }

  return background;
}

export function backgroundToPreviewStyle(background) {
  const normalized = normalizeBackgroundSelection(background);

  if (normalized.type === "solid") {
    return normalized.value;
  }

  if (normalized.type === "gradient") {
    return normalized.css;
  }

  return "transparent";
}

export function getBackgroundFormatLabel(background) {
  const normalized = normalizeBackgroundSelection(background);

  if (normalized.type === "gradient") {
    return "PNG (Gradient Background)";
  }

  if (normalized.type === "solid") {
    return "PNG (Solid Color)";
  }

  return "PNG (Transparent)";
}

export function getBackgroundDownloadSuffix(background) {
  const normalized = normalizeBackgroundSelection(background);

  if (normalized.type === "gradient") {
    return "gradient-bg";
  }

  if (normalized.type === "solid") {
    return "solid-bg";
  }

  return "nobg";
}

function addGradientStops(fill, stops = []) {
  if (Array.isArray(stops) && stops.length > 0) {
    stops.forEach((stop, index) => {
      const offset = typeof stop.offset === "number" ? stop.offset : index / Math.max(stops.length - 1, 1);
      fill.addColorStop(offset, stop.color);
    });
    return;
  }

  fill.addColorStop(0, "#f5c800");
  fill.addColorStop(1, "#f97316");
}

function paintLinearGradient(ctx, width, height, background) {
  const angle = typeof background.angle === "number" ? background.angle : 135;
  const radians = ((angle - 90) * Math.PI) / 180;
  const centerX = width / 2;
  const centerY = height / 2;
  const halfX = (Math.cos(radians) * width) / 2;
  const halfY = (Math.sin(radians) * height) / 2;

  const fill = ctx.createLinearGradient(
    centerX - halfX,
    centerY - halfY,
    centerX + halfX,
    centerY + halfY
  );

  addGradientStops(fill, background.stops);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);
}

function paintRadialGradient(ctx, width, height, background) {
  const innerRadius = Math.min(width, height) * 0.1;
  const outerRadius = Math.max(width, height) * 0.7;
  const fill = ctx.createRadialGradient(
    width * 0.5,
    height * 0.35,
    innerRadius,
    width * 0.5,
    height * 0.5,
    outerRadius
  );

  addGradientStops(fill, background.stops);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);
}

export function paintCanvasBackground(ctx, width, height, background) {
  const normalized = normalizeBackgroundSelection(background);

  if (normalized.type === "solid") {
    ctx.fillStyle = normalized.value;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (normalized.type === "gradient") {
    if (normalized.variant === "radial") {
      paintRadialGradient(ctx, width, height, normalized);
    } else {
      paintLinearGradient(ctx, width, height, normalized);
    }
  }
}

export async function composeImageWithBackground(resultUrl, background) {
  const normalized = normalizeBackgroundSelection(background);

  if (normalized.type === "transparent") {
    const response = await fetch(resultUrl);
    return response.blob();
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas export is not supported in this browser."));
        return;
      }

      paintCanvasBackground(ctx, canvas.width, canvas.height, normalized);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to prepare the PNG export."));
          return;
        }
        resolve(blob);
      }, "image/png");
    };

    image.onerror = () => reject(new Error("Failed to prepare the image for export."));
    image.src = resultUrl;
  });
}
