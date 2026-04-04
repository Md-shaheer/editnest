import { useState, useRef, useCallback } from "react";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export default function UploadZone({ onFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState("");
  const inputRef = useRef(null);

  const validate = (file) => {
    if (!ACCEPTED.includes(file.type)) {
      setDragError("Only JPEG, PNG, or WebP files are supported.");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDragError("File exceeds 10 MB limit.");
      return false;
    }
    setDragError("");
    return true;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validate(file)) onFile(file);
  }, [onFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  }, []);

  const handleChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && validate(file)) onFile(file);
  }, [onFile]);

  return (
    <div>
      <div
        className={`relative rounded-2xl cursor-pointer transition-all duration-200 ${isDragging ? "drag-active" : ""}`}
        style={{
          background: isDragging ? "var(--accent-dim)" : "var(--bg-surface)",
          border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border)"}`,
          minHeight: "280px",
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave} 
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden" onChange={handleChange} />
        <div className="flex flex-col items-center justify-center h-full py-16 px-6 select-none">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-base font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            {isDragging ? "Drop it here!" : "Drag & drop your image"}
          </p>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            or click to browse files
          </p>
          <button type="button"
            className="px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "var(--accent)", color: "#0a0a0b", pointerEvents: "none" }}>
            Choose Image
          </button>
        </div>
      </div>
      {dragError && (
        <p className="mt-3 text-sm text-center" style={{ color: "#f87171" }}>{dragError}</p>
      )}
    </div>
  );
}