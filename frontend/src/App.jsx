import { useCallback, useEffect, useRef, useState } from "react";
import UploadZone from "./components/UploadZone";
import ProcessingState from "./components/ProcessingState";
import ResultView from "./components/ResultView";
import ToolDashboard from "./components/ToolDashboard";
import Header from "./components/Header";
import AuthPage from "./components/AuthPage";
import ActivityDashboard from "./components/ActivityDashboard";
import { API_URL, REQUEST_TIMEOUT_MS } from "./api";
import { getSessionId, trackClientEvent } from "./analytics";
import {
  composeImageWithBackground,
  getBackgroundDownloadSuffix,
  normalizeBackgroundSelection,
} from "./utils/backgrounds";

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [phase, setPhase] = useState("idle");
  const [originalFile, setOriginalFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef(null);
  const trackedViewRef = useRef("");
  const trackedResultRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const sessionStartedAtRef = useRef(0);
  const activePageRef = useRef("");
  const activePageEnteredAtRef = useRef(0);

  const formatUploadError = useCallback((message) => {
    if (!message) {
      return "Something went wrong while removing the background.";
    }

    const normalizedMessage = String(message);

    if (
      normalizedMessage.includes("cannot identify image file") ||
      normalizedMessage.includes("could not be read as a valid JPG, PNG, or WebP image")
    ) {
      return "This file could not be read properly. Please upload a valid JPG, PNG, or WebP image.";
    }

    if (normalizedMessage.toLowerCase().includes("failed to fetch")) {
      return "Could not connect to the server. Please check that the backend is running and the API URL is correct.";
    }

    if (normalizedMessage.includes("The processed image output could not be decoded.")) {
      return "We could not finish processing this image cleanly. Please try another photo or upload a slightly smaller version.";
    }

    if (normalizedMessage.toLowerCase().includes("timed out")) {
      return "Processing is taking longer than expected. Please try again.";
    }

    return normalizedMessage;
  }, []);

  const getAnalyticsPage = useCallback(() => {
    if (!user) {
      return "auth";
    }

    if (showActivity) {
      return "activity";
    }

    if (phase === "processing") {
      return "processing";
    }

    if (phase === "done") {
      return "result";
    }

    return currentView;
  }, [currentView, phase, showActivity, user]);

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
      .then(async (response) => {
        if (!response.ok) {
          const authError = new Error("Not authenticated");
          authError.status = response.status;
          throw authError;
        }

        return response.json();
      })
      .then((data) => {
        setUser({
          token,
          username: data.username || username,
          email: data.email || email,
          isAdmin: !!data.is_admin,
        });
      })
      .catch((error) => {
        if (error?.status >= 400 && error?.status < 500) {
          localStorage.removeItem("token");
          localStorage.removeItem("username");
          localStorage.removeItem("email");
          localStorage.removeItem("is_admin");
          setUser(null);
          return;
        }

        setUser({
          token,
          username,
          email,
          isAdmin,
        });
      })
      .finally(() => setAuthChecked(true));
  }, []);

  const openDashboard = useCallback(() => {
    setShowActivity(false);
    setCurrentView("dashboard");
  }, []);

  const openBackgroundRemover = useCallback(() => {
    setShowActivity(false);
    setCurrentView("background-remover");
  }, []);

  const handleLogin = useCallback((data) => {
    setUser({
      token: data.token,
      username: data.username,
      email: data.email,
      isAdmin: !!data.is_admin,
    });
    setCurrentView("dashboard");
  }, []);

  const handleLogout = useCallback(() => {
    const token = localStorage.getItem("token");
    const page = activePageRef.current || (showActivity ? "activity" : currentView);

    trackClientEvent("logout", token, { page });

    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("is_admin");

    setUser(null);
    setShowActivity(false);
    setCurrentView("dashboard");
    setPhase("idle");
  }, [currentView, showActivity]);

  useEffect(() => {
    if (!authChecked) return undefined;

    const token = localStorage.getItem("token");
    const nextPage = getAnalyticsPage();
    const now = Date.now();

    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true;
      sessionStartedAtRef.current = now;
      trackClientEvent("session_start", token, {
        page: nextPage,
        details: {
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
        },
      });
    }

    const previousPage = activePageRef.current;
    const previousEnteredAt = activePageEnteredAtRef.current;

    if (previousPage && previousPage !== nextPage) {
      trackClientEvent("page_leave", token, {
        page: previousPage,
        details: {
          duration_ms: Math.max(0, now - previousEnteredAt),
          to_page: nextPage,
        },
      });
    }

    if (!previousPage || previousPage !== nextPage) {
      activePageRef.current = nextPage;
      activePageEnteredAtRef.current = now;
      trackClientEvent("page_view", token, {
        page: nextPage,
        details: {
          from_page: previousPage || null,
        },
      });
    }

    return undefined;
  }, [authChecked, getAnalyticsPage]);

  useEffect(() => {
    if (!authChecked || !sessionStartedRef.current) return undefined;

    const intervalId = window.setInterval(() => {
      const token = localStorage.getItem("token");
      const now = Date.now();
      const currentPage = activePageRef.current || getAnalyticsPage();

      trackClientEvent("session_ping", token, {
        page: currentPage,
        details: {
          page_duration_ms: Math.max(0, now - activePageEnteredAtRef.current),
          session_duration_ms: Math.max(0, now - sessionStartedAtRef.current),
        },
      });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [authChecked, getAnalyticsPage]);

  useEffect(() => {
    if (!authChecked) return undefined;

    const flushSessionEnd = () => {
      const token = localStorage.getItem("token");
      const now = Date.now();

      trackClientEvent("session_end", token, {
        page: activePageRef.current || getAnalyticsPage(),
        details: {
          page_duration_ms: Math.max(0, now - activePageEnteredAtRef.current),
          session_duration_ms: Math.max(0, now - sessionStartedAtRef.current),
        },
      });
    };

    window.addEventListener("pagehide", flushSessionEnd);
    return () => {
      window.removeEventListener("pagehide", flushSessionEnd);
    };
  }, [authChecked, getAnalyticsPage]);

  useEffect(() => {
    if (!authChecked) return;

    const token = localStorage.getItem("token");
    const nextEvent = user ? (showActivity ? "activity_view" : "dashboard_view") : "auth_view";
    const nextPage = getAnalyticsPage();
    const nextKey = `${nextEvent}:${nextPage}`;

    if (trackedViewRef.current === nextKey) return;
    trackedViewRef.current = nextKey;

    trackClientEvent(nextEvent, token, {
      page: nextPage,
      details: user ? { email: user.email } : null,
    });
  }, [authChecked, getAnalyticsPage, showActivity, user]);

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
    setErrorMsg("");
    setCurrentView("background-remover");
    setPhase("processing");
    setProgress(10);
    trackedResultRef.current = false;

    let progressTicker;
    let timeoutId;
    let didTimeout = false;

    try {
      progressTicker = setInterval(() => {
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

      clearInterval(progressTicker);
      setProgress(95);

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ detail: "Unknown error" }));

        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }

        throw new Error(errorPayload.detail || `Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const nextResultUrl = URL.createObjectURL(blob);

      setResultUrl(nextResultUrl);
      setProgress(100);
      setPhase("done");
    } catch (error) {
      if (error.name === "AbortError") {
        if (didTimeout) {
          setErrorMsg("The request timed out. Please try again, or check that the backend URL is correct.");
        }

        setPhase("idle");
        setProgress(0);
        return;
      }

      setErrorMsg(formatUploadError(error.message));
      setPhase("idle");
      setProgress(0);
    } finally {
      if (progressTicker) clearInterval(progressTicker);
      if (timeoutId) window.clearTimeout(timeoutId);
      abortControllerRef.current = null;
    }
  }, [formatUploadError, handleLogout, originalUrl, resultUrl]);

  const handleCancel = useCallback(() => {
    trackClientEvent("upload_cancelled", localStorage.getItem("token"), {
      page: "processing",
      details: {
        file_name: originalFile?.name || null,
      },
    });

    abortControllerRef.current?.abort();
  }, [originalFile]);

  const handleReset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);

    setOriginalFile(null);
    setOriginalUrl(null);
    setResultUrl(null);
    setErrorMsg("");
    setProgress(0);
    setPhase("idle");
    setCurrentView("dashboard");
    trackedResultRef.current = false;
  }, [originalUrl, resultUrl]);

  const handleDownload = useCallback(async (background = "transparent") => {
    if (!resultUrl) return;

    const normalizedBackground = normalizeBackgroundSelection(background);
    const fileName = originalFile?.name?.replace(/\.[^.]+$/, "") || "image";

    const triggerDownload = (href) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = `${fileName}_${getBackgroundDownloadSuffix(normalizedBackground)}.png`;
      link.click();
    };

    try {
      const composedBlob = await composeImageWithBackground(resultUrl, normalizedBackground);
      const downloadUrl = URL.createObjectURL(composedBlob);
      triggerDownload(downloadUrl);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
      setErrorMsg(error.message || "Failed to download image.");
    }
  }, [originalFile, resultUrl]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <svg className="spinner" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent-bright)" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 16% 20%, rgba(56, 189, 248, 0.12), transparent 25%), radial-gradient(circle at 84% 12%, rgba(99, 102, 241, 0.14), transparent 20%), radial-gradient(circle at 72% 76%, rgba(168, 85, 247, 0.12), transparent 24%)",
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <style>{`
          @keyframes slideDown {
            from { transform: translate(-50%, -20px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
        `}</style>

        {errorMsg ? (
          <div
            className="fixed left-1/2 top-8 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full px-5 py-3 shadow-2xl backdrop-blur-xl transition-all"
            style={{
              background: "rgba(40, 15, 15, 0.9)",
              border: "1px solid rgba(248, 113, 113, 0.3)",
              color: "#f87171",
              animation: "slideDown 0.3s ease-out",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-sm font-medium">{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="ml-2 opacity-60 transition-opacity hover:opacity-100">
              x
            </button>
          </div>
        ) : null}

        <Header
          user={user}
          onLogout={handleLogout}
          onOpenActivity={() => setShowActivity((current) => !current)}
          showActivity={showActivity}
          onOpenTools={openDashboard}
          currentView={currentView}
        />

        <main className="flex flex-1 flex-col items-center px-4 pb-14 pt-10 md:px-6">
          {showActivity && user.isAdmin ? (
            <ActivityDashboard user={user} onClose={() => setShowActivity(false)} onError={setErrorMsg} />
          ) : null}

          {!showActivity && currentView === "dashboard" ? (
            <ToolDashboard
              user={user}
              hasCutout={Boolean(resultUrl)}
              onOpenTool={openBackgroundRemover}
            />
          ) : null}

          {!showActivity && currentView === "background-remover" && phase === "idle" ? (
            <section className="fade-up w-full max-w-4xl">
              <div className="mb-10 text-center">
                <p
                  className="inline-flex rounded-full border px-4 py-1.5 text-sm"
                  style={{
                    background: "rgba(15, 23, 42, 0.7)",
                    borderColor: "rgba(59, 130, 246, 0.24)",
                    color: "#93c5fd",
                  }}
                >
                  Instant transparent PNG export
                </p>
                <h2
                  className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold tracking-tight text-white md:text-6xl"
                  style={{ letterSpacing: "-0.04em", lineHeight: 1.05 }}
                >
                  Remove backgrounds in seconds with a clean, studio-style workflow.
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-lg" style={{ color: "var(--text-secondary)", lineHeight: "1.8" }}>
                  Upload a product shot, portrait, or catalog photo and get a polished transparent cutout right away.
                </p>
              </div>

              <div
                className="rounded-[32px] p-4 md:p-6"
                style={{
                  background: "linear-gradient(180deg, rgba(10, 15, 30, 0.88) 0%, rgba(2, 8, 23, 0.96) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 24px 90px rgba(0, 0, 0, 0.32)",
                }}
              >
                <UploadZone onFile={handleFile} />
              </div>

              <p className="mt-5 text-center text-sm" style={{ color: "var(--text-muted)", lineHeight: "1.7" }}>
                Your image is used only for temporary processing and transparent export.
              </p>
            </section>
          ) : null}

          {!showActivity && currentView === "background-remover" && phase === "processing" ? (
            <div className="fade-up mt-12 flex w-full max-w-md flex-col items-center justify-center">
              <svg className="spinner mb-8" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent-bright)" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <ProcessingState progress={progress} fileName={originalFile?.name} />
              <button
                onClick={handleCancel}
                className="mt-8 rounded-full px-6 py-2.5 text-sm font-medium transition-all hover:opacity-80"
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                Cancel upload
              </button>
            </div>
          ) : null}

          {!showActivity && currentView === "background-remover" && phase === "done" ? (
            <div className="fade-up w-full max-w-5xl">
              <ResultView
                originalFile={originalFile}
                originalUrl={originalUrl}
                resultUrl={resultUrl}
                onDownload={handleDownload}
                onReset={handleReset}
                onError={setErrorMsg}
              />
            </div>
          ) : null}
        </main>

        <footer className="flex flex-col items-center gap-2 py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          <p>
            Powered by <span style={{ color: "var(--accent-bright)" }}>EditNest</span>
          </p>
          <a
            href="https://instagram.com/editnest99?igsh=MXVvdWZvd2Q4bDRwbQ=="
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-opacity hover:opacity-80"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "var(--text-secondary)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ color: "#E1306C", filter: "drop-shadow(0 0 8px rgba(225, 48, 108, 0.35))" }}
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            <span>Instagram @editnest99</span>
          </a>
          <p>&copy; {new Date().getFullYear()} EditNest. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
