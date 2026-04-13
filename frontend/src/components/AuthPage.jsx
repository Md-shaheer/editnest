import { useState, useEffect } from "react";
import { signInWithApple, signInWithGoogle } from "../firebase";
import { API_URL } from "../api";
import { getSessionId } from "../analytics";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [authConfig, setAuthConfig] = useState({ inviteOnly: false, message: "" });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (error) {
      const timeoutId = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [error]);

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/auth/config`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load auth config");
        }
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setAuthConfig({
          inviteOnly: !!data.invite_only,
          message: data.message || "",
        });
      })
      .catch(() => {
        if (!active) return;
        setAuthConfig({ inviteOnly: false, message: "" });
      });

    return () => {
      active = false;
    };
  }, []);

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

    if (message === "Failed to fetch" || message.toLowerCase().includes("failed to fetch")) {
      return "Could not connect to the server. Please check that the backend is running and the API URL is correct.";
    }

    if (message === "Not Found") {
      return "Google login backend is still updating. Please redeploy Railway and try again.";
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

    if (message === "Use Google login for this account") {
      return "This account was created with Google. Please use Continue with Google.";
    }

    if (message === "Use Apple login for this account") {
      return "This account was created with Apple. Please use Continue with Apple.";
    }

    if (message === "Google authentication failed") {
      return "Google login failed. Please try again.";
    }

    if (
      message === "Access restricted. This email is not approved for this website." ||
      message.toLowerCase().includes("not approved for this website")
    ) {
      return "This website is private. Only approved email addresses can sign up or log in.";
    }

    return message;
  };

  const handleSocialLogin = async ({ providerName, signIn, setLoading }) => {
    setError("");
    setLoading(true);

    try {
      const socialUser = await signIn();
      const idToken = await socialUser.getIdToken();
      const response = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": getSessionId(),
        },
        body: JSON.stringify({
          id_token: idToken,
          username: socialUser.displayName || socialUser.email?.split("@")[0] || "",
          provider: providerName,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(toFriendlyError(data.detail || "Google authentication failed"));
      }

      persistAuth(data);
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user") {
        setError(`${providerName === "apple" ? "Apple" : "Google"} popup closed before login completed.`);
      } else if (err?.code === "auth/unauthorized-domain") {
        setError(`This website domain is not allowed in Firebase ${providerName === "apple" ? "Apple" : "Google"} login.`);
      } else if (err?.code === "auth/operation-not-allowed") {
        setError(`${providerName === "apple" ? "Apple" : "Google"} login is not enabled yet.`);
      } else {
        setError(toFriendlyError(err.message || `${providerName === "apple" ? "Apple" : "Google"} authentication failed`));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await handleSocialLogin({
      providerName: "google",
      signIn: signInWithGoogle,
      setLoading: setGoogleLoading,
    });
  };

  const handleApple = async () => {
    await handleSocialLogin({
      providerName: "apple",
      signIn: signInWithApple,
      setLoading: setAppleLoading,
    });
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

      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none" style={{ background: "#4169e1", opacity: 0.18 }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[150px] pointer-events-none" style={{ background: "#8a2be2", opacity: 0.12 }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "64px 64px", WebkitMaskImage: "radial-gradient(circle at center, black, transparent 80%)", maskImage: "radial-gradient(circle at center, black, transparent 80%)" }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="EditNest" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4" />
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.5rem", color: "var(--text-primary)" }}>
            <span
              style={{
                background: "linear-gradient(to right, #8a2be2 0%, #ffffff 45%, #00e5ff 100%)",
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

        <div className="rounded-3xl p-8 shadow-2xl backdrop-blur-xl" style={{ background: "rgba(18, 14, 34, 0.72)", border: "1px solid var(--border)" }}>
          {authConfig.inviteOnly ? (
            <div
              className="mb-4 rounded-2xl px-4 py-3 text-left"
              style={{
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.18)",
                color: "#c6f4ff",
              }}
            >
              <p className="text-sm font-medium">Private access only</p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                {authConfig.message || "Use an approved email address to sign up or log in."}
              </p>
            </div>
          ) : null}

          <button
            onClick={handleGoogle}
            disabled={googleLoading || appleLoading || formLoading}
            className="w-full py-3 rounded-xl text-sm font-medium mb-4 flex items-center justify-center gap-3 transition-all hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ background: "white", color: "#1a1a1a", border: "1px solid #e0e0e0" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M21.8 12.23c0-.77-.07-1.5-.2-2.2H12v4.16h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.4 3.05-7.6Z"
                fill="#4285F4"
              />
              <path
                d="M12 22c2.76 0 5.08-.91 6.77-2.47l-3.3-2.56c-.91.61-2.08.97-3.47.97-2.67 0-4.93-1.8-5.73-4.22H2.86v2.64A10 10 0 0 0 12 22Z"
                fill="#34A853"
              />
              <path
                d="M6.27 13.72A5.98 5.98 0 0 1 5.95 12c0-.6.11-1.18.31-1.72V7.64H2.86A10 10 0 0 0 2 12c0 1.6.38 3.11 1.06 4.36l3.21-2.64Z"
                fill="#FBBC05"
              />
              <path
                d="M12 6.06c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.07 3.03 14.76 2 12 2A10 10 0 0 0 2.86 7.64l3.4 2.64C7.07 7.86 9.33 6.06 12 6.06Z"
                fill="#EA4335"
              />
            </svg>
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
              Sign up
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {mode === "signup" && (
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Username</label>
                <input
                  type="text"
                  placeholder="Your name"
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
                    <div className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: strength >= 1 ? (strength === 1 ? "#f87171" : strength === 2 ? "#4169e1" : "#00e5ff") : "var(--border)" }} />
                    <div className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: strength >= 2 ? (strength === 2 ? "#4169e1" : "#00e5ff") : "var(--border)" }} />
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
              disabled={googleLoading || appleLoading || formLoading}
              className="w-full py-3 rounded-xl text-sm font-medium mt-2 transition-all hover:scale-[1.02]"
              style={{ background: "var(--accent-gradient)", color: "#ffffff", boxShadow: "0 0 25px rgba(65, 105, 225, 0.35)", opacity: formLoading || googleLoading || appleLoading ? 0.7 : 1 }}
            >
              {formLoading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
            </button>
          </div>
        </div>

        <p className="text-center mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ color: "var(--accent-bright)" }}>
            {mode === "login" ? "Sign up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
