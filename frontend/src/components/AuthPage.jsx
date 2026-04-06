import { useState, useEffect } from "react";
import { signInWithGoogle } from "../firebase";
import { API_URL } from "../api";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const getPasswordStrength = () => {
    if (!password) return 0;
    const hasLen = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSpecialOrMixed = /[^A-Za-z0-9]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password));
    if (hasLen && hasLetter && hasNum) return hasSpecialOrMixed ? 3 : 2;
    return 1;
  };
  const strength = getPasswordStrength();

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      const email = user.email;
      const username = user.displayName || email.split("@")[0];
      const password = user.uid; // Use Firebase UID as a unique password

      let res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        res = await fetch(`${API_URL}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Google authentication failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");

    if (mode === "signup") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long");
        return;
      }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        setError("Password must contain at least one letter and one number");
        return;
      }
    }

    setFormLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      const body = mode === "login"
        ? { email, password }
        : { email, username, password };
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}>
      
      {error && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl backdrop-blur-xl transition-all"
          style={{ background: "rgba(40, 15, 15, 0.9)", border: "1px solid rgba(248, 113, 113, 0.3)", color: "#f87171", animation: "slideDown 0.3s ease-out" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError("")} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}

      {/* Premium Ambient Glow & Grid for Auth */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none" style={{ background: "#f5c800", opacity: 0.15 }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[150px] pointer-events-none" style={{ background: "#bc1888", opacity: 0.08 }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "64px 64px", WebkitMaskImage: "radial-gradient(circle at center, black, transparent 80%)", maskImage: "radial-gradient(circle at center, black, transparent 80%)" }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="EditNest"
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4" />
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "2.5rem", color: "var(--text-primary)" }}>
            <span style={{
              background: "linear-gradient(to right, #f5c800 0%, #ffffff 50%, #f5c800 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              animation: "textShimmer 3s linear infinite"
            }}>EditNest</span>
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            AI Background Remover
          </p>
        </div>

        <style>{`
          @keyframes textShimmer {
            to { background-position: 200% center; }
          }
          @keyframes slideDown {
            from { transform: translate(-50%, -20px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
        `}</style>

        <div className="rounded-3xl p-8 shadow-2xl backdrop-blur-xl"
          style={{ background: "rgba(30, 30, 32, 0.6)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>

          {/* Google Sign-in Button */}
          <button onClick={handleGoogle} disabled={googleLoading || formLoading}
            className="w-full py-3 rounded-xl text-sm font-medium mb-4 flex items-center justify-center gap-3 transition-all hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ background: "white", color: "#1a1a1a", border: "1px solid #e0e0e0" }}>
            {googleLoading ? (
              <>
                <svg className="spinner" width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-4"
            style={{ background: "var(--bg-base)" }}>
            <button onClick={() => { setMode("login"); setError(""); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{
                background: mode === "login" ? "var(--bg-elevated)" : "transparent",
                color: mode === "login" ? "var(--text-primary)" : "var(--text-secondary)",
                border: mode === "login" ? "1px solid var(--border)" : "1px solid transparent",
              }}>Login</button>
            <button onClick={() => { setMode("signup"); setError(""); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{
                background: mode === "signup" ? "var(--bg-elevated)" : "transparent",
                color: mode === "signup" ? "var(--text-primary)" : "var(--text-secondary)",
                border: mode === "signup" ? "1px solid var(--border)" : "1px solid transparent",
              }}>Sign Up</button>
          </div>

          <div className="flex flex-col gap-3">
            {mode === "signup" && (
              <div>
                <label className="text-xs mb-1 block"
                  style={{ color: "var(--text-secondary)" }}>Username</label>
                <input type="text" placeholder="yourname" value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-base)",
                    border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
            )}
            <div>
              <label className="text-xs mb-1 block"
                style={{ color: "var(--text-secondary)" }}>Email</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-base)",
                  border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="text-xs mb-1 block"
                style={{ color: "var(--text-secondary)" }}>Password</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-base)",
                  border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          {mode === "signup" && password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                <div className="h-1 flex-1 rounded-full transition-colors duration-300"
                  style={{ background: strength >= 1 ? (strength === 1 ? "#f87171" : strength === 2 ? "#f5c800" : "#34d399") : "var(--border)" }} />
                <div className="h-1 flex-1 rounded-full transition-colors duration-300"
                  style={{ background: strength >= 2 ? (strength === 2 ? "#f5c800" : "#34d399") : "var(--border)" }} />
                <div className="h-1 flex-1 rounded-full transition-colors duration-300"
                  style={{ background: strength >= 3 ? "#34d399" : "var(--border)" }} />
              </div>
              <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>
                {strength === 1 ? "Weak" : strength === 2 ? "Good" : "Strong"}
              </p>
            </div>
          )}
            </div>
            <button onClick={handleSubmit} disabled={googleLoading || formLoading}
              className="w-full py-3 rounded-xl text-sm font-medium mt-2"
              style={{ background: "#f5c800", color: "#0a0a0b",
                opacity: formLoading || googleLoading ? 0.7 : 1 }}>
              {formLoading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
            </button>
          </div>
        </div>

        <p className="text-center mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
            style={{ color: "#f5c800" }}>
            {mode === "login" ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
