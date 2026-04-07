import { useState, useEffect } from "react";
import { signInWithGoogle } from "../firebase";
import { API_URL } from "../api";
import { getSessionId } from "../analytics";

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
      const timeoutId = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timeoutId);
    }
  }, [error]);

  const getPasswordStrength = () => {
    if (!password) return 0;
    const hasLength = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialOrMixed = /[^A-Za-z0-9]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password));

    if (hasLength && hasLetter && hasNumber) {
      return hasSpecialOrMixed ? 3 : 2;
    }

    return 1;
  };

  const strength = getPasswordStrength();

  const persistAuth = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("username", data.username);
    localStorage.setItem("email", data.email);
    localStorage.setItem("is_admin", String(!!data.is_admin));
    onLogin(data);
  };

  const toFriendlyError = (message, nextMode = mode) => {
    if (!message) {
      return nextMode === "login" ? "Login failed" : "Signup failed";
    }

    if (message === "Email already registered") {
      setMode("login");
      return "This email already has an account. Please login instead.";
    }

    if (message === "Username already taken") {
      return "This username is already taken. Try another one.";
    }

    if (message === "Invalid email or password") {
      return "Wrong email or password.";
    }

    if (message === "Google authentication failed") {
      return "Google login failed. Please try again.";
    }

    return message;
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const googleUser = await signInWithGoogle();
      const idToken = await googleUser.getIdToken();
      const response = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": getSessionId(),
        },
        body: JSON.stringify({
          id_token: idToken,
          username: googleUser.displayName || googleUser.email?.split("@")[0] || "",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(toFriendlyError(data.detail || "Google authentication failed"));
      }

      persistAuth(data);
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user") {
        setError("Google popup closed before login completed.");
      } else if (err?.code === "auth/unauthorized-domain") {
        setError("This website domain is not allowed in Firebase Google login.");
      } else {
        setError(toFriendlyError(err.message || "Google authentication failed"));
      }
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
      const body = mode === "login" ? { email, password } : { email, username, password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": getSessionId(),
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(toFriendlyError(data.detail || "Something went wrong", mode));
      }

      persistAuth(data);
    } catch (err) {
      setError(toFriendlyError(err.message || "Authentication failed", mode));
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {error && (
        <div
          className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl backdrop-blur-xl transition-all"
          style={{ background: "rgba(40, 15, 15, 0.9)", border: "1px solid rgba(248, 113, 113, 0.3)", color: "#f87171", animation: "slideDown 0.3s ease-out" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError("")} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            x
          </button>
        </div>
      )}

      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none" style={{ background: "#f5c800", opacity: 0.15 }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[150px] pointer-events-none" style={{ background: "#bc1888", opacity: 0.08 }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "64px 64px", WebkitMaskImage: "radial-gradient(circle at center, black, transparent 80%)", maskImage: "radial-gradient(circle at center, black, transparent 80%)" }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="EditNest" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4" />
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.5rem", color: "var(--text-primary)" }}>
            <span
              style={{
                background: "linear-gradient(to right, #f5c800 0%, #ffffff 50%, #f5c800 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
                animation: "textShimmer 3s linear infinite",
              }}
            >
              EditNest
            </span>
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

        <div className="rounded-3xl p-8 shadow-2xl backdrop-blur-xl" style={{ background: "rgba(30, 30, 32, 0.6)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
          <button
            onClick={handleGoogle}
            disabled={googleLoading || formLoading}
            className="w-full py-3 rounded-xl text-sm font-medium mb-4 flex items-center justify-center gap-3 transition-all hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ background: "white", color: "#1a1a1a", border: "1px solid #e0e0e0" }}
          >
            {googleLoading ? "Connecting..." : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <div className="flex rounded-xl p-1 mb-4" style={{ background: "var(--bg-base)" }}>
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{
                background: mode === "login" ? "var(--bg-elevated)" : "transparent",
                color: mode === "login" ? "var(--text-primary)" : "var(--text-secondary)",
                border: mode === "login" ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              Login
            </button>
            <button
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{
                background: mode === "signup" ? "var(--bg-elevated)" : "transparent",
                color: mode === "signup" ? "var(--text-primary)" : "var(--text-secondary)",
                border: mode === "signup" ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              Sign Up
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {mode === "signup" && (
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Username</label>
                <input
                  type="text"
                  placeholder="yourname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            )}

            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Password</label>
              <input
                type="password"
                placeholder="........"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />

              {mode === "signup" && password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    <div className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: strength >= 1 ? (strength === 1 ? "#f87171" : strength === 2 ? "#f5c800" : "#34d399") : "var(--border)" }} />
                    <div className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: strength >= 2 ? (strength === 2 ? "#f5c800" : "#34d399") : "var(--border)" }} />
                    <div className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: strength >= 3 ? "#34d399" : "var(--border)" }} />
                  </div>
                  <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>
                    {strength === 1 ? "Weak" : strength === 2 ? "Good" : "Strong"}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={googleLoading || formLoading}
              className="w-full py-3 rounded-xl text-sm font-medium mt-2"
              style={{ background: "#f5c800", color: "#0a0a0b", opacity: formLoading || googleLoading ? 0.7 : 1 }}
            >
              {formLoading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
            </button>
          </div>
        </div>

        <p className="text-center mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ color: "#f5c800" }}>
            {mode === "login" ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
