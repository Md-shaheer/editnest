import React, { useEffect, useState } from "react";

export default function Header({
  user,
  onLogout,
  onOpenActivity,
  showActivity,
  onOpenTools,
  currentView,
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const displayName = user?.username?.trim() || user?.email?.split("@")[0] || "User";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full px-6 py-4 transition-all duration-300 md:px-8 md:py-5 border-b border-gray-800/50 ${
        isScrolled 
          ? "bg-[#020817]/95 backdrop-blur-md shadow-lg" 
          : "bg-[#020817]/80 backdrop-blur-sm"
      }`}
    >
      {/* ഇവിടെ max-w-7xl ഒഴിവാക്കി പൂർണ്ണ വീതി (w-full) നൽകിയിരിക്കുന്നു */}
      <div className="flex w-full items-center justify-between gap-4">
        
        {/* 1. Left Side - Logo & Brand */}
        <button
          type="button"
          onClick={onOpenTools}
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-yellow-400">
            <img
              src="/logo.jpg"
              alt="EditNest Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            edit<span className="text-yellow-400">nest</span>
          </span>
        </button>

        {/* 2. Right Side - Nav & Auth Actions */}
        <div className="flex flex-1 items-center justify-end gap-3 md:gap-4">
          
          {user?.isAdmin && (
            <button
              type="button"
              onClick={onOpenActivity}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition duration-300 border ${
                showActivity
                  ? "bg-blue-600/20 text-blue-400 border-blue-600/30"
                  : "bg-[#1a1f35] text-gray-300 border-gray-700/50 hover:bg-[#252b48]"
              }`}
            >
              Activity
            </button>
          )}

          {currentView !== "dashboard" && (
            <button
              type="button"
              onClick={onOpenTools}
              className="rounded-full bg-[#1a1f35] border border-gray-700/50 hover:bg-[#252b48] px-5 py-2 text-sm font-medium text-white transition duration-300"
            >
              Home
            </button>
          )}

          {user ? (
            <>
              <span className="max-w-28 truncate text-xs text-gray-300 sm:max-w-40 sm:text-sm md:max-w-none">
                <span className="sm:hidden">Hi, </span>
                <span className="hidden sm:inline">Welcome, </span>
                <span className="font-semibold text-yellow-400">{displayName}</span>
              </span>
              
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full px-5 py-2 text-sm font-medium transition duration-300 bg-[#1a1f35] border border-gray-700/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenTools}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-2 text-sm font-medium text-white transition duration-300"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
