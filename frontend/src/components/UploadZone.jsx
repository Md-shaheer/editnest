import { useCallback, useEffect, useRef, useState } from "react";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_UPLOAD_SIZE_MB = 10;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export default function UploadZone({ onFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!dragError) return undefined;

    const timeoutId = setTimeout(() => setDragError(""), 4000);
    return () => clearTimeout(timeoutId);
  }, [dragError]);

  const processFile = useCallback(async (file) => {
    if (!ACCEPTED.includes(file.type)) {
      setDragError("Only JPEG, PNG, or WebP files are supported.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setDragError(`Please upload an image smaller than ${MAX_UPLOAD_SIZE_MB}MB for high-quality processing.`);
      return;
    }

    setDragError("");
    setIsPreparing(true);

    try {
      await onFile(file);
    } finally {
      setIsPreparing(false);
    }
  }, [onFile]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    event.target.value = "";
  }, [processFile]);

  return (
    <div>
      <div
        className={`relative cursor-pointer rounded-[32px] transition-all duration-300 ${isDragging ? "scale-[1.01]" : ""}`}
        style={{
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(2, 8, 23, 0.98) 100%)",
          border: `1.5px dashed ${isDragging ? "var(--accent-bright)" : "rgba(59, 130, 246, 0.28)"}`,
          minHeight: "280px",
          boxShadow: isDragging
            ? "0 18px 48px rgba(37, 99, 235, 0.16), 0 0 0 1px rgba(34, 211, 238, 0.18)"
            : "0 18px 45px rgba(0, 0, 0, 0.28)",
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
          onClick={(event) => event.stopPropagation()}
        />

        <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center select-none">
          <div
            className="pulse-button mb-6 flex h-24 w-24 items-center justify-center rounded-full"
            style={{
              background: "rgba(250, 204, 21, 0.08)",
              border: "1px solid rgba(250, 204, 21, 0.28)",
              boxShadow: "0 0 0 1px rgba(250, 204, 21, 0.08), 0 0 30px rgba(250, 204, 21, 0.12)",
            }}
          >
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M5 20h14a2 2 0 0 0 2-2v-3" />
              <path d="M3 15v3a2 2 0 0 0 2 2" />
            </svg>
          </div>

          <button
            type="button"
            className={`mb-6 rounded-2xl px-10 py-4 text-base font-bold transition-all ${isPreparing ? "opacity-60" : ""}`}
            style={{
              background: "var(--accent-gradient)",
              color: "#ffffff",
              pointerEvents: "none",
              boxShadow: "0 14px 30px rgba(65, 105, 225, 0.28)",
            }}
          >
            {isPreparing ? "Preparing image..." : "Upload Image"}
          </button>

          <p className="mb-2 text-xl font-medium tracking-tight" style={{ color: "var(--text-primary)" }}>
            {isPreparing ? "Keeping original quality..." : isDragging ? "Drop it here" : "Drag and drop your image"}
          </p>

          <p className="mb-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            {isPreparing ? "Uploading the original file for cleaner edges." : `PNG, JPG, or WebP files up to ${MAX_UPLOAD_SIZE_MB}MB`}
          </p>

          <p className="mb-6 text-xs" style={{ color: "var(--text-muted)" }}>
            Original upload quality is preserved for better cutout accuracy.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {["People", "Product", "Car", "Animals"].map((label, index) => (
              <span
                key={label}
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-[11px] font-semibold"
                style={{
                  background: index % 2 === 0 ? "rgba(37, 99, 235, 0.14)" : "rgba(34, 211, 238, 0.12)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>

      {dragError ? (
        <div
          className="fixed top-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full px-5 py-3 shadow-2xl backdrop-blur-xl transition-all"
          style={{ background: "rgba(40, 15, 15, 0.9)", border: "1px solid rgba(248, 113, 113, 0.3)", color: "#f87171", animation: "slideDown 0.3s ease-out" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-sm font-medium">{dragError}</span>
          <button onClick={() => setDragError("")} className="ml-2 opacity-60 transition-opacity hover:opacity-100">
            x
          </button>
        </div>
      ) : null}
    </div>
  );
}
