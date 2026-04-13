import { useState, useEffect, useRef } from "react";
import { backgroundToPreviewStyle, composeImageWithBackground, TRANSPARENT_BACKGROUND } from "../utils/backgrounds";

const tabs = ["Compare", "Before", "After"];

export default function ResultView({ originalFile, originalUrl, resultUrl, onDownload, onReset, onError }) {
  const [activeTab, setActiveTab] = useState(0);
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
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const handleCopy = async () => {
    if (!navigator.clipboard || !window.ClipboardItem) {
      if (onError) onError("Copying images to clipboard is not supported in your browser or context.");
      return;
    }

    try {
      const blobToCopy = await composeImageWithBackground(resultUrl, TRANSPARENT_BACKGROUND);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blobToCopy })]);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy image:", err);
      if (onError) onError("Failed to copy image to clipboard.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "2rem",
              color: "var(--text-primary)",
              letterSpacing: "0.04em",
            }}
          >
            Background removed
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Your image is ready as a transparent PNG
            </p>
            {originalFile ? (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                {formatSize(originalFile.size)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            New image
          </button>
          <button
            onClick={handleCopy}
            aria-live="polite"
            className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={() => onDownload(TRANSPARENT_BACKGROUND)}
            className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 hover:opacity-90"
            style={{ background: "var(--accent)", color: "#ffffff", boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)" }}
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
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`panel-${index}`}
            id={`tab-${index}`}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              background: activeTab === index ? "var(--bg-elevated)" : "transparent",
              color: activeTab === index ? "var(--text-primary)" : "var(--text-secondary)",
              border: activeTab === index ? "1px solid var(--border)" : "1px solid transparent",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 ? (
        <div id="panel-0" role="tabpanel" aria-labelledby="tab-0" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImagePanel label="Original" url={originalUrl} showChecker={false} />
          <ImagePanel label="Background removed" url={resultUrl} showChecker={true} accent background={TRANSPARENT_BACKGROUND} />
        </div>
      ) : null}
      {activeTab === 1 ? (
        <div id="panel-1" role="tabpanel" aria-labelledby="tab-1">
          <ImagePanel label="Original" url={originalUrl} showChecker={false} tall />
        </div>
      ) : null}
      {activeTab === 2 ? (
        <div id="panel-2" role="tabpanel" aria-labelledby="tab-2">
          <ImagePanel label="Background removed" url={resultUrl} showChecker={true} accent tall background={TRANSPARENT_BACKGROUND} />
        </div>
      ) : null}
    </div>
  );
}

function ImagePanel({ label, url, showChecker, accent, tall, background = TRANSPARENT_BACKGROUND }) {
  const backgroundStyle = backgroundToPreviewStyle(background);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${accent ? "rgba(59,130,246,0.25)" : "var(--border)"}`,
        background: "var(--bg-surface)",
      }}
    >
      <div
        className="px-4 py-3 flex items-center"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: accent
            ? "linear-gradient(90deg, rgba(59,130,246,0.12), rgba(59,130,246,0.03) 40%, transparent 85%)"
            : "transparent",
        }}
      >
        <span
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase px-3 py-1.5 rounded-full"
          style={{
            color: accent ? "#93c5fd" : "var(--text-secondary)",
            background: accent ? "rgba(59, 130, 246, 0.08)" : "rgba(255,255,255,0.03)",
            border: accent ? "1px solid rgba(59, 130, 246, 0.24)" : "1px solid var(--border-subtle)",
            boxShadow: accent ? "0 10px 30px rgba(59, 130, 246, 0.08)" : "none",
          }}
        >
          {accent ? (
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                background: "linear-gradient(180deg, #93c5fd 0%, var(--accent) 100%)",
                boxShadow: "0 0 12px rgba(59, 130, 246, 0.5)",
              }}
            />
          ) : null}
          {label}
        </span>
      </div>
      <div
        className={`relative flex items-center justify-center ${tall ? "min-h-96" : "min-h-64"} p-4 transition-colors duration-300`}
        style={{ background: showChecker && background.type !== "transparent" ? backgroundStyle : "transparent" }}
      >
        {showChecker && background.type === "transparent" ? <div className="absolute inset-0 checker-bg" style={{ opacity: 0.6 }} /> : null}
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
