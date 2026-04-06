export default function Header({ user, onLogout }) {
  return (
    <header className="w-full px-6 py-4 flex items-center justify-between sticky top-0 z-50"
      style={{ 
        borderBottom: "1px solid var(--border-subtle)", 
        background: "rgba(10, 10, 11, 0.6)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)"
      }}>
      <div className="flex items-center gap-3">
        <img src="/logo.jpg" alt="EditNest"
          className="w-14 h-14 rounded-xl object-cover" />
        <span className="text-lg font-medium tracking-tight"
          style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>
          edit<span style={{ color: "#f5c800" }}>nest</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              👋 <span style={{ color: "#f5c800" }}>{user.username}</span>
            </span>
            <button onClick={onLogout}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}>
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}