import { useState, useCallback, useEffect } from "react";
import UploadZone from "./components/UploadZone";
import ProcessingState from "./components/ProcessingState";
import ResultView from "./components/ResultView";
import Header from "./components/Header";
import AuthPage from "./components/AuthPage";

const API_URL = "http://localhost:8080";

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

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    if (token && username) {
      setUser({ token, username });
    }
    setAuthChecked(true);
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
    const objUrl = URL.createObjectURL(file);
    setOriginalFile(file);
    setOriginalUrl(objUrl);
    setResultUrl(null);
    setResultBlob(null);
    setErrorMsg("");
    setPhase("processing");
    setProgress(10);

    try {
      const ticker = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 8, 85));
      }, 400);

      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/remove-bg`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      clearInterval(ticker);
      setProgress(95);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
      setProgress(100);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong.");
      setPhase("error");
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
    if (!resultBlob) return;
    const a = document.createElement("a");
    const name = originalFile?.name?.replace(/\.[^.]+$/, "") || "image";
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${name}_nobg.png`;
    a.click();
  }, [resultBlob, originalFile]);

  if (!authChecked) return null;

  if (!user) return <AuthPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>
      <Header user={user} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {phase === "idle" && (
          <div className="fade-up w-full max-w-2xl">
            <div className="text-center mb-10">
              <h2 className="text-5xl md:text-6xl tracking-tight mb-3"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--text-primary)" }}>
                EditNest Background Remover
              </h2>
              <p style={{ color: "var(--text-secondary)" }}>
                Welcome, <span style={{ color: "#f5c800" }}>{user.username}</span>! Upload a photo — EditNest AI removes the background instantly.
              </p>
            </div>
            <UploadZone onFile={handleFile} />
          </div>
        )}
        {phase === "processing" && (
          <ProcessingState progress={progress} fileName={originalFile?.name} />
        )}
        {phase === "done" && (
          <div className="fade-up w-full max-w-5xl">
            <ResultView
              originalUrl={originalUrl}
              resultUrl={resultUrl}
              onDownload={handleDownload}
              onReset={handleReset}
            />
          </div>
        )}
        {phase === "error" && (
          <div className="fade-up text-center max-w-md">
            <div className="rounded-2xl p-8 mb-6"
              style={{ background: "var(--bg-surface)", border: "1px solid #3a1a1a" }}>
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium mb-2">Processing Failed</h3>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{errorMsg}</p>
              <button onClick={handleReset}
                className="px-6 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: "#f5c800", color: "#0a0a0b" }}>
                Try Again
              </button>
            </div>
          </div>
        )}
      </main>
      <footer className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>
        Powered by <span style={{ color: "#f5c800" }}>EditNest</span> · AI Background Remover
      </footer>
    </div>
  );
}