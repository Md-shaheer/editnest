import { useState, useCallback, useEffect, useRef } from "react";
import UploadZone from "./components/UploadZone";
import ProcessingState from "./components/ProcessingState";
import ResultView from "./components/ResultView";
import Header from "./components/Header";
import AuthPage from "./components/AuthPage";

const API_URL = import.meta.env.DEV
  ? "http://localhost:8000"
  : "https://editnest-api.onrender.com";

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [originalFile, setOriginalFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    if (token && username) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        if (res.ok) {
          setUser({ token, username });
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("username");
        }
      })
      .catch(() => setUser({ token, username }))
      .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  const handleLogin = useCallback((data) => {
    setUser(data);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUser(null);
    setPhase("idle");
  }, []);

  const handleFile = useCallback(async (file) => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    const objUrl = URL.createObjectURL(file);
    setOriginalFile(file);
    setOriginalUrl(objUrl);
    setResultUrl(null);
    setResultBlob(null);
    setErrorMsg("");
    setPhase("processing");
    setProgress(10);

    let ticker;
    try {
      ticker = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 8, 85));
      }, 400);

      abortControllerRef.current = new AbortController();
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/remove-bg`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: abortControllerRef.current.signal,
        body: formData,
      });

      clearInterval(ticker);
      setProgress(95);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        if (res.status === 401) {
          handleLogout();
        }
        throw new Error(err.detail || `Server error: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
      setProgress(100);
      setPhase("done");
    } catch (err) {
      if (ticker) clearInterval(ticker);
      if (err.name === "AbortError") {
        setPhase("idle");
        setProgress(0);
        return;
      }
      setErrorMsg(err.message || "Something went wrong.");
      setPhase("idle");
      setProgress(0);
    }
  }, [originalUrl, resultUrl, handleLogout]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleReset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setOriginalFile(null);
    setOriginalUrl(null);
    setResultUrl(null);
    setResultBlob(null);
    setErrorMsg("");
    setProgress(0);
    setPhase("idle");
  }, [originalUrl, resultUrl]);

  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    const name = originalFile?.name?.replace(/\.[^.]+$/, "") || "image";
    a.href = resultUrl;
    a.download = `${name}_nobg.png`;
    a.click();
  }, [resultUrl, originalFile]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <svg className="spinner" width="44" height="44" viewBox="0 0 24 24"
          fill="none" stroke="#f5c800" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>
    );
  }

  if (!user) return <AuthPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* Premium Ambient Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none" style={{ background: "#f5c800", animation: "glowPulse1 12s ease-in-out infinite" }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[150px] pointer-events-none" style={{ background: "#bc1888", animation: "glowPulse2 15s ease-in-out infinite" }} />

      {/* Premium Grid Background Overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "64px 64px", WebkitMaskImage: "radial-gradient(circle at center, black, transparent 80%)", maskImage: "radial-gradient(circle at center, black, transparent 80%)" }} />

      <div className="relative z-10 flex flex-col flex-1">
        <style>{`
          @keyframes textShimmer {
            to { background-position: 200% center; }
          }
          @keyframes glowPulse1 {
            0%, 100% { opacity: 0.15; transform: scale(1); }
            50% { opacity: 0.25; transform: scale(1.1); }
          }
          @keyframes glowPulse2 {
            0%, 100% { opacity: 0.08; transform: scale(1); }
            50% { opacity: 0.18; transform: scale(1.15); }
          }
          @keyframes slideDown {
            from { transform: translate(-50%, -20px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
        `}</style>
        
        {errorMsg && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl backdrop-blur-xl transition-all"
            style={{ background: "rgba(40, 15, 15, 0.9)", border: "1px solid rgba(248, 113, 113, 0.3)", color: "#f87171", animation: "slideDown 0.3s ease-out" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span className="text-sm font-medium">{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">✕</button>
          </div>
        )}

        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          {phase === "idle" && (
            <div className="fade-up w-full max-w-2xl">
              <div className="text-center mb-12">
                <h2 className="text-5xl md:text-7xl tracking-tight mb-4"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  <span style={{
                    background: "linear-gradient(to right, #f5c800 0%, #ffffff 50%, #f5c800 100%)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    color: "transparent",
                    animation: "textShimmer 3s linear infinite"
                  }}>EditNest</span>
                  <span style={{ color: "var(--text-primary)" }}> Background Remover</span>
                </h2>
                <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
                  Welcome, <span style={{ color: "#f5c800", fontWeight: "500" }}>{user.username}</span>! Upload a photo and let our AI seamlessly remove the background in seconds.
                </p>
              </div>
              <UploadZone onFile={handleFile} />
            </div>
          )}
        {phase === "processing" && (
          <div className="fade-up flex flex-col items-center justify-center w-full max-w-md mt-8">
            <svg className="spinner mb-8" width="44" height="44" viewBox="0 0 24 24"
              fill="none" stroke="#f5c800" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <ProcessingState progress={progress} fileName={originalFile?.name} />
            <button onClick={handleCancel}
              className="mt-8 px-6 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              Cancel Upload
            </button>
          </div>
        )}
        {phase === "done" && (
          <div className="fade-up w-full max-w-5xl">
            <ResultView
              originalFile={originalFile}
              resultBlob={resultBlob}
              originalUrl={originalUrl}
              resultUrl={resultUrl}
              onDownload={handleDownload}
              onReset={handleReset}
              onError={setErrorMsg}
            />
          </div>
        )}
      </main>
      <footer className="text-center py-6 text-xs flex flex-col items-center gap-2" style={{ color: "var(--text-muted)" }}>
        <p>
          Powered by <span style={{ color: "#f5c800" }}>EditNest</span> · AI Background Remover
        </p>
        <p>&copy; {new Date().getFullYear()} EditNest. All rights reserved.</p>
        <a href="https://www.instagram.com/editnest99?igsh=MXVvdWZvd2Q4bDRwbQ==" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 mt-1 transition-opacity hover:opacity-80 font-medium">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="url(#ig-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f09433" />
                <stop offset="25%" stopColor="#e6683c" />
                <stop offset="50%" stopColor="#dc2743" />
                <stop offset="75%" stopColor="#cc2366" />
                <stop offset="100%" stopColor="#bc1888" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
          <span style={{
            background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent"
          }}>
            Follow us on Instagram
          </span>
        </a>
      </footer>
      </div>
    </div>
  );
}