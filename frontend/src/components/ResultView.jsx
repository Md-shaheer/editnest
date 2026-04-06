import { useState, useEffect, useRef } from "react";

const tabs = ["Side by Side", "Before", "After"];

export default function ResultView({ originalFile, resultBlob, originalUrl, resultUrl, onDownload, onReset, onError }) {
  const [activeTab, setActiveTab] = useState(0);
  const [bgColor, setBgColor] = useState("transparent");
  const [copied, setCopied] = useState(false);

  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const formatSize = (bytes) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + " KB";
    return (kb / 1024).toFixed(2) + " MB";
  };

  const handleCopy = async () => {
    if (!navigator.clipboard || !window.ClipboardItem) {
      if (onError) onError("Copying images to clipboard is not supported in your browser or context.");
      return;
    }

    try {
      let blobToCopy;
      if (bgColor === "transparent") {
        const res = await fetch(resultUrl);
        blobToCopy = await res.blob();
      } else {
        blobToCopy = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(resolve, "image/png");
          };
          img.src = resultUrl;
        });
      }

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blobToCopy })
      ]);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy image:", err);
      if (onError) onError("Failed to copy image to clipboard.");
    }
  };

  const presetColors = ["#ffffff", "#000000", "#f5c800", "#34d399", "#60a5fa"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "2rem",
              color: "var(--text-primary)",
              letterSpacing: "0.04em"
            }}
          >
            Background Removed
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Your image is ready - transparent PNG, full quality
            </p>
            {originalFile && resultBlob && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)"
                }}
              >
                {formatSize(originalFile.size)} {"->"} {formatSize(resultBlob.size)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)"
            }}
          >
            New Image
          </button>
          <button
            onClick={handleCopy}
            aria-live="polite"
            className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)"
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={() => onDownload(bgColor)}
            className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ background: "var(--accent)", color: "#0a0a0b" }}
          >
            Download PNG
          </button>
        </div>
      </div>

      <div
        className="inline-flex rounded-xl p-1 mb-5"
        role="tablist"
        aria-label="Image view options"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            role="tab"
            aria-selected={activeTab === i}
            aria-controls={`panel-${i}`}
            id={`tab-${i}`}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              background: activeTab === i ? "var(--bg-elevated)" : "transparent",
              color: activeTab === i ? "var(--text-primary)" : "var(--text-secondary)",
              border: activeTab === i ? "1px solid var(--border)" : "1px solid transparent"
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div id="panel-0" role="tabpanel" aria-labelledby="tab-0" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImagePanel label="Original" url={originalUrl} showChecker={false} />
          <ImagePanel label="Background Removed" url={resultUrl} showChecker={true} accent bgColor={bgColor} />
        </div>
      )}
      {activeTab === 1 && (
        <div id="panel-1" role="tabpanel" aria-labelledby="tab-1">
          <ImagePanel label="Original" url={originalUrl} showChecker={false} tall />
        </div>
      )}
      {activeTab === 2 && (
        <div id="panel-2" role="tabpanel" aria-labelledby="tab-2">
          <ImagePanel label="Background Removed" url={resultUrl} showChecker={true} accent tall bgColor={bgColor} />
        </div>
      )}

      <div
        className="mt-6 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
            Background:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBgColor("transparent")}
              aria-label="Set transparent background"
              className="w-8 h-8 rounded-full overflow-hidden relative border transition-transform hover:scale-110"
              style={{
                borderColor: "var(--border)",
                outline: bgColor === "transparent" ? "2px solid var(--accent)" : "none",
                outlineOffset: "2px"
              }}
              title="Transparent"
            >
              <div className="absolute inset-0 checker-bg" />
            </button>
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() => setBgColor(color)}
                aria-label={`Set solid color background to ${color}`}
                className="w-8 h-8 rounded-full border shadow-sm transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: "var(--border)",
                  outline: bgColor === color ? "2px solid var(--accent)" : "none",
                  outlineOffset: "2px"
                }}
                title={color}
              />
            ))}
            <label
              className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border transition-transform hover:scale-110 flex items-center justify-center"
              aria-label="Custom background color picker"
              style={{
                borderColor: "var(--border)",
                background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                outline: !["transparent", ...presetColors].includes(bgColor) ? "2px solid var(--accent)" : "none",
                outlineOffset: "2px"
              }}
              title="Custom Color"
            >
              <input
                type="color"
                value={bgColor === "transparent" ? "#ffffff" : bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text-muted)" }}>Format:</span>
          <span className="font-medium px-2 py-1 rounded" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
            {bgColor === "transparent" ? "PNG (Transparent)" : "PNG (Solid Color)"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ImagePanel({ label, url, showChecker, accent, tall, bgColor = "transparent" }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${accent ? "rgba(245,166,35,0.25)" : "var(--border)"}`,
        background: "var(--bg-surface)"
      }}
    >
      <div className="px-4 py-2.5 flex items-center" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <span className="text-xs font-medium" style={{ color: accent ? "var(--accent)" : "var(--text-secondary)" }}>
          {accent && <span className="mr-1.5">*</span>}
          {label}
        </span>
      </div>
      <div
        className={`relative flex items-center justify-center ${tall ? "min-h-96" : "min-h-64"} p-4 transition-colors duration-300`}
        style={{ background: showChecker && bgColor !== "transparent" ? bgColor : "transparent" }}
      >
        {showChecker && bgColor === "transparent" && <div className="absolute inset-0 checker-bg" style={{ opacity: 0.6 }} />}
        <img
          src={url}
          alt={label}
          className="relative max-w-full max-h-full object-contain rounded-lg"
          style={{ maxHeight: tall ? "600px" : "380px" }}
        />
      </div>
    </div>
  );
}
