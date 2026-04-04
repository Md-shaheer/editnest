import { useState } from "react";

const tabs = ["Side by Side", "Before", "After"];

export default function ResultView({ originalUrl, resultUrl, onDownload, onReset }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem",
            color: "var(--text-primary)", letterSpacing: "0.04em" }}>
            Background Removed
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Your image is ready — transparent PNG, full quality
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--bg-elevated)",
              border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            ↺ New Image
          </button>
          <button onClick={onDownload}
            className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ background: "var(--accent)", color: "#0a0a0b" }}>
            ⬇ Download PNG
          </button>
        </div>
      </div>

      <div className="inline-flex rounded-xl p-1 mb-5"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              background: activeTab === i ? "var(--bg-elevated)" : "transparent",
              color: activeTab === i ? "var(--text-primary)" : "var(--text-secondary)",
              border: activeTab === i ? "1px solid var(--border)" : "1px solid transparent",
            }}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImagePanel label="Original" url={originalUrl} showChecker={false} />
          <ImagePanel label="Background Removed" url={resultUrl} showChecker={true} accent />
        </div>
      )}
      {activeTab === 1 && <ImagePanel label="Original" url={originalUrl} showChecker={false} tall />}
      {activeTab === 2 && <ImagePanel label="Background Removed" url={resultUrl} showChecker={true} accent tall />}

      <div className="mt-4 rounded-xl px-4 py-3 flex items-center justify-between text-xs"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <span style={{ color: "var(--text-muted)" }}>Output format</span>
        <span className="font-medium px-2 py-0.5 rounded"
          style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
          PNG · Transparent background
        </span>
      </div>
    </div>
  );
}

function ImagePanel({ label, url, showChecker, accent, tall }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${accent ? "rgba(245,166,35,0.25)" : "var(--border)"}`,
        background: "var(--bg-surface)" }}>
      <div className="px-4 py-2.5 flex items-center"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <span className="text-xs font-medium"
          style={{ color: accent ? "var(--accent)" : "var(--text-secondary)" }}>
          {accent && <span className="mr-1.5">✦</span>}{label}
        </span>
      </div>
      <div className={`relative flex items-center justify-center ${tall ? "min-h-96" : "min-h-64"} p-4`}>
        {showChecker && <div className="absolute inset-0 checker-bg" style={{ opacity: 0.6 }} />}
        <img src={url} alt={label}
          className="relative max-w-full max-h-full object-contain rounded-lg"
          style={{ maxHeight: tall ? "600px" : "380px" }} />
      </div>
    </div>
  );
}