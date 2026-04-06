import { useState, useRef, useCallback, useEffect } from "react";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

const compressImage = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Scale down image drastically to ensure the backend processes under 512MB RAM
      const maxDim = 1024;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Compress to WebP at 85% quality to preserve transparency
      canvas.toBlob((blob) => {
        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
          type: "image/webp",
          lastModified: Date.now(),
        });
        resolve(newFile);
      }, "image/webp", 0.85);
    };
  });
};

export default function UploadZone({ onFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (dragError) {
      const t = setTimeout(() => setDragError(""), 4000);
      return () => clearTimeout(t);
    }
  }, [dragError]);

  const processFile = useCallback(async (file) => {
    if (!ACCEPTED.includes(file.type)) {
      setDragError("Only JPEG, PNG, or WebP files are supported.");
      return;
    }
    setDragError("");

    // Always compress and resize images before uploading to accommodate the backend's strict 512MB limit
    setIsCompressing(true);
    const compressed = await compressImage(file);
    setIsCompressing(false);
    onFile(compressed);
  }, [onFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  }, []);

  const handleChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div>
      <div
        className={`relative rounded-3xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${isDragging ? "drag-active scale-[1.02] shadow-2xl" : ""}`}
        style={{
          background: isDragging ? "rgba(245, 200, 0, 0.05)" : "rgba(30, 30, 32, 0.4)",
          border: `2px dashed ${isDragging ? "#f5c800" : "rgba(255, 255, 255, 0.1)"}`,
          backdropFilter: "blur(12px)",
          minHeight: "280px",
          boxShadow: isDragging ? "0 0 40px rgba(245, 200, 0, 0.15)" : "0 0 0 rgba(0,0,0,0)",
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave} 
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden" onChange={handleChange}
          onClick={(e) => e.stopPropagation()} />
        <div className="flex flex-col items-center justify-center h-full py-16 px-6 select-none relative z-10">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 relative transition-all duration-500"
            style={{ background: "rgba(245, 200, 0, 0.1)", border: "1px solid rgba(245, 200, 0, 0.2)" }}>
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: "#f5c800", animationDuration: "3s" }} />
            <svg className="relative z-10" width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#f5c800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-xl font-medium mb-2 tracking-tight" style={{ color: "var(--text-primary)" }}>
            {isCompressing ? "Optimizing Image..." : isDragging ? "Drop it here!" : "Drag & drop your image"}
          </p>
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
            {isCompressing ? "Please wait a moment." : "High-quality PNG, JPG, or WebP up to 5MB"}
          </p>
          <p className="text-xs mb-6 opacity-70" style={{ color: "var(--text-muted)" }}>
            Note: Processing may take 10-15 seconds due to server capacity.
          </p>
          <button type="button"
            className={`px-8 py-3 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-xl ${isCompressing ? "opacity-50" : ""}`}
            style={{ background: "linear-gradient(135deg, #f5c800 0%, #eab308 100%)", color: "#0a0a0b", pointerEvents: "none" }}>
            {isCompressing ? "Processing..." : "Choose Image"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
      {dragError && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl backdrop-blur-xl transition-all"
          style={{ background: "rgba(40, 15, 15, 0.9)", border: "1px solid rgba(248, 113, 113, 0.3)", color: "#f87171", animation: "slideDown 0.3s ease-out" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span className="text-sm font-medium">{dragError}</span>
          <button onClick={() => setDragError("")} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}
    </div>
  );
}