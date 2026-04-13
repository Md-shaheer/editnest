const STEPS = [
  { label: "Uploading image", threshold: 15 },
  { label: "Preparing image", threshold: 35 },
  { label: "Removing background", threshold: 65 },
  { label: "Finalizing PNG", threshold: 90 },
];

export default function ProcessingState({ progress, fileName }) {
  const currentStep = [...STEPS].reverse().find((step) => progress >= step.threshold) || STEPS[0];

  return (
    <div className="fade-up flex flex-col items-center text-center max-w-sm w-full">
      <div className="relative w-24 h-24 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="var(--bg-elevated)" strokeWidth="6" />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="spinner" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
      </div>

      <h3
        className="text-xl font-medium mb-1"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "1.6rem",
          color: "var(--text-primary)",
          letterSpacing: "0.04em",
        }}
      >
        {currentStep.label}
      </h3>

      {fileName ? (
        <p className="text-xs mb-6 truncate max-w-xs" style={{ color: "var(--text-muted)" }}>
          {fileName}
        </p>
      ) : null}

      <div className="w-full h-1.5 rounded-full overflow-hidden relative" style={{ background: "var(--bg-elevated)" }}>
        <div
          className="h-full rounded-full shimmer relative overflow-hidden transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--accent), #fbbf24)",
          }}
        />
      </div>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        {Math.round(progress)}%
      </p>

      <div className="flex gap-1.5 mt-6">
        {STEPS.map((step) => (
          <div
            key={step.label}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: progress >= step.threshold ? "24px" : "8px",
              background: progress >= step.threshold ? "var(--accent)" : "var(--bg-elevated)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
