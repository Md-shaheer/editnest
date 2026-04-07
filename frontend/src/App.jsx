import { useState, useCallback, useEffect, useRef } from "react";
import UploadZone from "./components/UploadZone";
import ProcessingState from "./components/ProcessingState";
import ResultView from "./components/ResultView";
import Header from "./components/Header";
import AuthPage from "./components/AuthPage";
import ActivityDashboard from "./components/ActivityDashboard";
import { API_URL, REQUEST_TIMEOUT_MS } from "./api";
import { getSessionId, trackClientEvent } from "./analytics";

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [originalFile, setOriginalFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef(null);
  const trackedViewRef = useRef("");
  const trackedResultRef = useRef(false);

  useEffect(() => {
    if (!errorMsg) return undefined;
    const timeoutId = setTimeout(() => setErrorMsg(""), 4000);
    return () => clearTimeout(timeoutId);
  }, [errorMsg]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const email = localStorage.getItem("email");
    const isAdmin = localStorage.getItem("is_admin") === "true";

    if (!token || !username) {
      setAuthChecked(true);
      return;
    }

    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Not authenticated");
        }
        return res.json();
      })
      .then((data) => {
        setUser({
          token,
          username: data.username || username,
          email: data.email || email,
          isAdmin: !!data.is_admin,
        });
      })
      .catch(() => {
        setUser({
          token,
          username,
          email,
          isAdmin,
        });
      })
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogin = useCallback((data) => {
    setUser({
      token: data.token,
      username: data.username,
      email: data.email,
      isAdmin: !!data.is_admin,
    });
  }, []);

  const handleLogout = useCallback(() => {
    const token = localStorage.getItem("token");
    trackClientEvent("logout", token, {
      page: showActivity ? "activity" : phase,
    });

    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("is_admin");
    setUser(null);
    setShowActivity(false);
    setPhase("idle");
  }, [phase, showActivity]);

  useEffect(() => {
    if (!authChecked) return;

    const token = localStorage.getItem("token");
    const nextEvent = user ? (showActivity ? "activity_view" : "dashboard_view") : "auth_view";
    const nextPage = user ? (showActivity ? "activity" : "dashboard") : "auth";
    const nextKey = `${nextEvent}:${nextPage}`;

    if (trackedViewRef.current === nextKey) return;
    trackedViewRef.current = nextKey;

    trackClientEvent(nextEvent, token, {
      page: nextPage,
      details: user ? { email: user.email } : null,
    });
  }, [authChecked, showActivity, user]);

  useEffect(() => {
    if (phase !== "done" || trackedResultRef.current) return;
    trackedResultRef.current = true;

    trackClientEvent("result_view", localStorage.getItem("token"), {
      page: "result",
      details: {
        file_name: originalFile?.name || null,
      },
    });
  }, [originalFile, phase]);

  const handleFile = useCallback(async (file) => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);

    const objectUrl = URL.createObjectURL(file);
    setOriginalFile(file);
    setOriginalUrl(objectUrl);
    setResultUrl(null);
    setResultBlob(null);
    setErrorMsg("");
    setPhase("processing");
    setProgress(10);
    trackedResultRef.current = false;

    let ticker;
    let timeoutId;
    let didTimeout = false;

    try {
      ticker = setInterval(() => {
        setProgress((current) => Math.min(current + Math.random() * 8, 99));
      }, 400);

      abortControllerRef.current = new AbortController();
      timeoutId = window.setTimeout(() => {
        didTimeout = true;
        abortControllerRef.current?.abort();
      }, REQUEST_TIMEOUT_MS);

      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/remove-bg`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Session-Id": getSessionId(),
        },
        signal: abortControllerRef.current.signal,
        body: formData,
      });

      clearInterval(ticker);
      setProgress(95);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Unknown error" }));
        if (response.status === 401) {
          handleLogout();
        }
        throw new Error(err.detail || `Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const nextResultUrl = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(nextResultUrl);
      setProgress(100);
      setPhase("done");
    } catch (err) {
      if (err.name === "AbortError") {
        if (didTimeout) {
          setErrorMsg("The request timed out. Please try again, or check that the backend URL is correct.");
        }
        setPhase("idle");
        setProgress(0);
        return;
      }

      setErrorMsg(err.message || "Something went wrong.");
      setPhase("idle");
      setProgress(0);
    } finally {
      if (ticker) clearInterval(ticker);
      if (timeoutId) window.clearTimeout(timeoutId);
      abortControllerRef.current = null;
    }
  }, [handleLogout, originalUrl, resultUrl]);

  const handleCancel = useCallback(() => {
    trackClientEvent("upload_cancelled", localStorage.getItem("token"), {
      page: "processing",
      details: {
        file_name: originalFile?.name || null,
      },
    });

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [originalFile]);

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
    trackedResultRef.current = false;
  }, [originalUrl, resultUrl]);

  const handleDownload = useCallback(async (bgColor = "transparent") => {
    if (!resultUrl) return;

    const fileName = originalFile?.name?.replace(/\.[^.]+$/, "") || "image";

    const triggerDownload = (href) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = `${fileName}_${bgColor === "transparent" ? "nobg" : "bg"}.png`;
      link.click();
    };

    if (bgColor === "transparent") {
      triggerDownload(resultUrl);
      return;
    }

    try {
      const composedBlob = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Canvas export is not supported in this browser."));
            return;
          }

          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("Failed to prepare the colored PNG."));
              return;
            }
            resolve(blob);
          }, "image/png");
        };
        img.onerror = () => reject(new Error("Failed to prepare the image for download."));
        img.src = resultUrl;
      });

      const downloadUrl = URL.createObjectURL(composedBlob);
      triggerDownload(downloadUrl);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to download image.");
    }
  }, [originalFile, resultUrl]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <svg className="spinner" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f5c800" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none" style={{ background: "#f5c800", animation: "glowPulse1 12s ease-in-out infinite" }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[150px] pointer-events-none" style={{ background: "#bc1888", animation: "glowPulse2 15s ease-in-out infinite" }} />
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
          <div
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl backdrop-blur-xl transition-all"
            style={{ background: "rgba(40, 15, 15, 0.9)", border: "1px solid rgba(248, 113, 113, 0.3)", color: "#f87171", animation: "slideDown 0.3s ease-out" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-sm font-medium">{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
              x
            </button>
          </div>
        )}

        <Header
          user={user}
          onLogout={handleLogout}
          onOpenActivity={() => setShowActivity((current) => !current)}
          showActivity={showActivity}
        />

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          {showActivity && user.isAdmin ? (
            <ActivityDashboard user={user} onClose={() => setShowActivity(false)} onError={setErrorMsg} />
          ) : null}

          {!showActivity && phase === "idle" ? (
            <div className="fade-up w-full max-w-2xl">
              <div className="text-center mb-12">
                <h2 className="text-5xl md:text-7xl tracking-tight mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
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
                  <span style={{ color: "var(--text-primary)" }}> Background Remover</span>
                </h2>
                <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
                  Welcome, <span style={{ color: "#f5c800", fontWeight: "500" }}>{user.username}</span>! Upload a photo and let our AI seamlessly remove the background in seconds.
                </p>
              </div>
              <UploadZone onFile={handleFile} />
              <div
                className="mt-5 mx-auto max-w-xl rounded-2xl px-4 py-3 text-sm text-center"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text-secondary)"
                }}
              >
                Privacy note: Uploaded images are processed temporarily for background removal. Original uploads are not permanently stored, and cached processed files are cleared automatically.
              </div>
            </div>
          ) : null}

          {!showActivity && phase === "processing" ? (
            <div className="fade-up flex flex-col items-center justify-center w-full max-w-md mt-8">
              <svg className="spinner mb-8" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f5c800" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <ProcessingState progress={progress} fileName={originalFile?.name} />
              <button
                onClick={handleCancel}
                className="mt-8 px-6 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                Cancel Upload
              </button>
            </div>
          ) : null}

          {!showActivity && phase === "done" ? (
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
          ) : null}
        </main>

        <footer className="text-center py-6 text-xs flex flex-col items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <p>
            Powered by <span style={{ color: "#f5c800" }}>EditNest</span> - AI Background Remover
          </p>
          <p>&copy; {new Date().getFullYear()} EditNest. All rights reserved.</p>
          <a
            href="https://www.instagram.com/editnest99?igsh=MXVvdWZvd2Q4bDRwbQ=="
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 mt-1 transition-opacity hover:opacity-80 font-medium"
          >
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
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            <span
              style={{
                background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Follow us on Instagram
            </span>
          </a>
        </footer>
      </div>
    </div>
  );
}
