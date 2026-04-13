export default function ToolDashboard({ hasCutout, onOpenTool }) {
  return (
    <section className="fade-up flex w-full max-w-5xl flex-col items-center pt-10 text-white md:pt-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <div
          className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium"
          style={{
            background: "rgba(34, 211, 238, 0.08)",
            border: "1px solid rgba(34, 211, 238, 0.18)",
            color: "#a5f3fc",
          }}
        >
          One-click background remover
        </div>

        <h1
          className="mt-8 max-w-4xl text-5xl font-extrabold tracking-tight text-white md:text-7xl"
          style={{ letterSpacing: "-0.06em", lineHeight: 1 }}
        >
          Turn ordinary photos into
          <span className="block bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 bg-clip-text text-transparent">
            clean, premium cutouts
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400 md:text-xl">
          Remove busy backgrounds in seconds and download a polished transparent PNG that feels ready for catalogues, profile photos, and product posts.
        </p>

        <button
          type="button"
          onClick={onOpenTool}
          className="glow-button mt-10 rounded-full px-10 py-4 text-lg font-semibold text-white transition duration-300 hover:scale-[1.02]"
          style={{
            background: "linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)",
          }}
        >
          Remove Background Now
        </button>

        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          {hasCutout ? "Your last cutout is ready. You can upload a new image anytime." : "No clutter. No extra steps. Just upload and download."}
        </p>
      </div>

      <div className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
        <MiniCard title="Sharp edges" text="Cleaner cutouts with better subject separation." />
        <MiniCard title="Original quality" text="Keeps the upload sharp for better-looking results." />
        <MiniCard title="Transparent PNG" text="Ready to use in designs, stores, and social posts." />
      </div>
    </section>
  );
}

function MiniCard({ title, text }) {
  return (
    <div
      className="rounded-[24px] px-6 py-6 text-left"
      style={{
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(2, 8, 23, 0.94) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.18)",
      }}
    >
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
    </div>
  );
}
