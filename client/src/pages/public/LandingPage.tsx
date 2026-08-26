import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// RecoverAI Cinematic Landing Page — Fully Responsive with Local Asset Fallback
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const tickingRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const numChapters = 9;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const stages = [
      { start: 0.0, end: 0.12 },
      { start: 0.12, end: 0.22 },
      { start: 0.22, end: 0.35 },
      { start: 0.35, end: 0.48 },
      { start: 0.48, end: 0.62 },
      { start: 0.62, end: 0.75 },
      { start: 0.75, end: 0.85 },
      { start: 0.85, end: 0.95 },
      { start: 0.95, end: 1.0 },
    ];

    // Initialise CSS variables
    root.style.setProperty("--scroll-progress", "0");
    root.style.setProperty("--chap-0-opacity", "1");
    for (let i = 1; i < numChapters; i++)
      root.style.setProperty(`--chap-${i}-opacity`, "0");
    root.style.setProperty("--hero-scale", "1");
    root.style.setProperty("--hero-blur", "0px");

    function updateScroll() {
      const scrollY = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, scrollY / maxScroll));

      root.style.setProperty("--scroll-progress", String(progress));
      let activeChapter = 0;

      for (let i = 0; i < numChapters; i++) {
        const stage = stages[i];
        let opacity = 0;

        if (progress >= stage.start && progress <= stage.end) {
          const width = stage.end - stage.start;
          const localP = (progress - stage.start) / width;
          if (localP < 0.2) opacity = localP / 0.2;
          else if (localP > 0.8) opacity = (1 - localP) / 0.2;
          else opacity = 1;
          if (opacity > 0.5) activeChapter = i;
        }

        if (
          i === numChapters - 1 &&
          progress >= stages[numChapters - 1].start
        ) {
          const localP =
            (progress - stage.start) / (stage.end - stage.start);
          opacity = Math.min(1, localP / 0.2);
          activeChapter = i;
        }

        root.style.setProperty(
          `--chap-${i}-opacity`,
          Math.max(0, opacity).toFixed(3)
        );
      }

      if (!prefersReducedMotion) {
        root.style.setProperty(
          "--hero-scale",
          (1 + progress * 0.05).toFixed(3)
        );
        root.style.setProperty(
          "--hero-blur",
          `${(Math.sin(progress * Math.PI) * 5).toFixed(1)}px`
        );
      }

      document.querySelectorAll(".chapter-dot").forEach((dot, index) => {
        if (index === activeChapter) dot.classList.add("active");
        else dot.classList.remove("active");
      });

      const navbar = document.getElementById("navbar");
      if (navbar) {
        if (scrollY > 50) {
          navbar.style.backgroundColor = "rgba(7,11,23,0.92)";
          navbar.style.backdropFilter = "blur(12px)";
          navbar.style.borderBottom = "1px solid rgba(255,255,255,0.07)";
        } else {
          navbar.style.backgroundColor = "transparent";
          navbar.style.backdropFilter = "none";
          navbar.style.borderBottom = "none";
        }
      }

      tickingRef.current = false;
    }

    const onScroll = () => {
      if (!tickingRef.current) {
        window.requestAnimationFrame(updateScroll);
        tickingRef.current = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* ── Scoped styles with responsive rules ─── */}
      <style>{`
        body {
          background-color: #070B17;
          color: #dee1f9;
        }

        .cinematic-stage {
          height: 1600vh;
          position: relative;
        }

        .viewport-pinned {
          position: sticky;
          top: 0;
          height: 100vh;
          height: 100dvh;
          width: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bg-grid-pattern {
          background-image:
            linear-gradient(to right, rgba(91,91,247,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(91,91,247,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .ambient-glow {
          position: absolute;
          width: min(800px, 90vw);
          height: min(800px, 90vw);
          background: radial-gradient(circle, rgba(91,91,247,0.15) 0%, transparent 60%);
          border-radius: 50%;
          pointer-events: none;
          z-index: -1;
          transform: translate(-50%, -50%);
        }

        .chapter-layer {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.5s ease-out, transform 0.5s ease-out;
          pointer-events: none;
          will-change: opacity, transform;
          padding: 1rem;
        }

        #layer-0 { opacity: var(--chap-0-opacity); transform: scale(calc(1 + (1 - var(--chap-0-opacity)) * 0.05)); }
        #layer-1 { opacity: var(--chap-1-opacity); transform: translateY(calc((1 - var(--chap-1-opacity)) * 20px)); }
        #layer-2 { opacity: var(--chap-2-opacity); transform: scale(calc(0.95 + var(--chap-2-opacity) * 0.05)); }
        #layer-3 { opacity: var(--chap-3-opacity); }
        #layer-4 { opacity: var(--chap-4-opacity); }
        #layer-5 { opacity: var(--chap-5-opacity); transform: translateY(calc((1 - var(--chap-5-opacity)) * 20px)); }
        #layer-6 { opacity: var(--chap-6-opacity); transform: scale(calc(0.9 + var(--chap-6-opacity) * 0.1)); }
        #layer-7 { opacity: var(--chap-7-opacity); transform: translateY(calc((1 - var(--chap-7-opacity)) * 20px)); }
        #layer-8 { opacity: var(--chap-8-opacity); transform: scale(calc(0.9 + var(--chap-8-opacity) * 0.1)); pointer-events: auto; }

        .hero-bg-container {
          transform: scale(var(--hero-scale));
          filter: blur(var(--hero-blur));
          transition: transform 0.1s linear, filter 0.1s linear;
          will-change: transform, filter;
        }

        /* Chapter indicator: Hidden by default on mobile/tablets, only visible on xl screens (>= 1280px) */
        .chapter-indicator {
          display: none;
        }

        @media (min-width: 1280px) {
          .chapter-indicator {
            position: fixed;
            left: 24px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 100;
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
        }

        .chapter-dot {
          width: 4px;
          height: 4px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          transition: all 0.3s ease;
          position: relative;
        }

        .chapter-dot.active {
          background: #c1c1ff;
          box-shadow: 0 0 10px #c1c1ff;
          height: 24px;
          border-radius: 4px;
        }

        .chapter-dot.active::after {
          content: attr(data-label);
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #c1c1ff;
          white-space: nowrap;
          letter-spacing: 0.1em;
        }

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          font-feature-settings: 'liga';
          -webkit-font-smoothing: antialiased;
        }

        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .chapter-layer, .hero-bg-container {
            transition: opacity 0.3s ease;
            transform: none !important;
            filter: none !important;
          }
        }
      `}</style>

      {/* TopNavBar */}
      <nav
        id="navbar"
        className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 sm:px-8 md:px-margin-desktop h-16 sm:h-20 md:h-24 bg-transparent"
        style={{ transition: "background-color 0.3s, backdrop-filter 0.3s, border-bottom 0.3s" }}
      >
        <div className="font-headline-md text-lg sm:text-xl md:text-[24px] font-bold text-on-surface tracking-tight">
          RecoverAI
        </div>
        <div className="flex items-center space-x-3 sm:space-x-5">
          <button
            onClick={() => navigate("/signup")}
            className="hidden md:block font-label-mono text-[11px] sm:text-label-mono text-on-surface-variant hover:text-white transition-colors"
          >
            Create Sandbox
          </button>
          <button
            onClick={() => navigate("/login")}
            className="hidden sm:block font-label-mono text-[11px] sm:text-label-mono text-on-surface-variant hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/login")}
            className="bg-primary/10 text-primary border border-primary/30 font-label-mono text-[10px] sm:text-[11px] px-3.5 sm:px-6 py-2 sm:py-2.5 rounded hover:bg-primary hover:text-surface-dim transition-all flex items-center gap-1.5 sm:gap-2 uppercase tracking-wider sm:tracking-widest pointer-events-auto"
          >
            Enter Sandbox
          </button>
        </div>
      </nav>

      <main className="relative z-10 cinematic-stage">
        <div className="viewport-pinned">

          {/* Background Plate - Local asset with CDN fallback */}
          <div className="absolute inset-0 z-0 hero-bg-container origin-center w-full h-full">
            <img
              alt="Atmospheric workspace"
              className="w-full h-full object-cover mix-blend-screen opacity-90"
              src="/hero-bg.jpg"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('googleusercontent')) {
                  target.src = "https://lh3.googleusercontent.com/aida/AEtjO1Wa-2ZofRJCQPIVGcHpHw4ZHHntvfuttqhzW5ZBu0BvdWjj-AyeXngBWIkCLS0eUnx5qh16EkaahxeH7-mRour6g6HGUqz0S0P8BWmg9QrbXyjtGXN9R9_hlJ0wKykkW9SLWSSnNtnSOLyjb0ceymZTRCWNXLK_j05EvyFDYkBTR5bgpcwvGWGA8fviGCZPMjBewholRlQ5YxF0eh5tmZxHDlTNhrT4VlRXnZxtJNQg7kUyvUfgRb62Xg";
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#070B17]/90 via-[#070B17]/60 to-[#070B17]/95 mix-blend-multiply" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(7,11,23,0.9)_100%)]" />
            <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
          </div>

          {/* Chapter Indicator (Desktop only) */}
          <div className="chapter-indicator hidden xl:flex">
            <div className="chapter-dot active" data-label="00/HERO" id="nav-dot-0" />
            <div className="chapter-dot" data-label="01/FAILURE" id="nav-dot-1" />
            <div className="chapter-dot" data-label="02/DIAGNOSIS" id="nav-dot-2" />
            <div className="chapter-dot" data-label="03/DECISION" id="nav-dot-3" />
            <div className="chapter-dot" data-label="04/EXECUTION" id="nav-dot-4" />
            <div className="chapter-dot" data-label="05/VERIFICATION" id="nav-dot-5" />
            <div className="chapter-dot" data-label="06/RECOVERY" id="nav-dot-6" />
            <div className="chapter-dot" data-label="07/ARCHITECTURE" id="nav-dot-7" />
            <div className="chapter-dot" data-label="08/SANDBOX" id="nav-dot-8" />
          </div>

          {/* 00 / HERO */}
          <div className="chapter-layer" id="layer-0">
            <div className="max-w-container-max mx-auto text-center px-4 sm:px-6 relative">
              <div className="ambient-glow top-1/2 left-1/2" />
              <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-display-hero font-bold font-display-hero text-on-surface max-w-5xl mx-auto mb-4 sm:mb-8 tracking-tighter drop-shadow-2xl leading-tight">
                Revenue doesn&apos;t disappear.
              </h1>
              <h2 className="font-headline-md text-primary-fixed-dim/90 max-w-3xl mx-auto font-normal text-sm sm:text-base md:text-body-md leading-relaxed">
                It slips through the cracks of legacy infrastructure. We isolate, diagnose, and recover failed transactions with cinematic precision.
              </h2>
            </div>
          </div>

          {/* 01 / FAILURE */}
          <div className="chapter-layer" id="layer-1">
            <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 md:gap-16 items-center">
              <div>
                <h3 className="font-headline-lg text-on-surface mb-3 sm:mb-6 text-2xl sm:text-3xl md:text-[44px] lg:text-[48px] leading-tight font-semibold">
                  The problem isn&apos;t one failed payment.
                </h3>
                <div className="font-label-mono text-primary text-[9px] sm:text-[10px] tracking-widest border border-primary/30 bg-primary/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded mb-4 sm:mb-8 inline-block backdrop-blur-sm">
                  DEMO / SYNTHETIC DATA
                </div>
                <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 font-label-mono text-xs sm:text-sm">
                  <div>
                    <div className="text-on-surface-variant/70 text-[10px] sm:text-xs mb-1">VALUE AT RISK</div>
                    <div className="text-on-surface text-base sm:text-lg md:text-xl font-bold">&#8377;7.51 Cr</div>
                  </div>
                  <div>
                    <div className="text-on-surface-variant/70 text-[10px] sm:text-xs mb-1">FAILED TXNS</div>
                    <div className="text-on-surface text-base sm:text-lg md:text-xl font-bold">2,491</div>
                  </div>
                  <div>
                    <div className="text-on-surface-variant/70 text-[10px] sm:text-xs mb-1">POTENTIALLY RECOVERABLE</div>
                    <div className="text-primary text-base sm:text-lg md:text-xl font-bold">18.4%</div>
                  </div>
                  <div>
                    <div className="text-on-surface-variant/70 text-[10px] sm:text-xs mb-1">RECOVERY OPPORTUNITY</div>
                    <div className="text-primary text-base sm:text-lg md:text-xl font-bold">&#8377;1.38 Cr</div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-surface-container-high/90 backdrop-blur-md border border-error/30 p-4 sm:p-6 md:p-8 rounded-lg w-full max-w-sm md:ml-auto shadow-[0_0_50px_rgba(255,180,171,0.1)]">
                  <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 border-b border-error/20 pb-2 sm:pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
                      <div className="font-label-mono text-error text-[11px] sm:text-[12px] font-bold tracking-wider">FAILED_TXN</div>
                    </div>
                    <div className="font-label-mono text-[9px] sm:text-[10px] text-on-surface-variant/70">txn_000102</div>
                  </div>
                  <div className="font-display-hero text-2xl sm:text-3xl md:text-display-hero-mobile text-on-surface mb-3 sm:mb-4 font-bold">
                    &#8377;18,000
                  </div>
                  <div className="font-label-mono text-xs sm:text-sm text-error bg-error/10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded inline-block border border-error/20">
                    Failure: GATEWAY_TIMEOUT
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 02 / DIAGNOSIS */}
          <div className="chapter-layer" id="layer-2">
            <div className="max-w-4xl mx-auto px-4 sm:px-8 w-full">
              <span className="font-label-mono text-primary text-[9px] sm:text-[10px] tracking-widest border border-primary/30 bg-primary/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded mb-4 sm:mb-8 inline-block backdrop-blur-sm">
                02 / DIAGNOSIS
              </span>
              <div className="bg-surface-container-high/80 backdrop-blur-xl border border-primary/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
                <div className="flex justify-between items-center mb-4 sm:mb-8 pb-3 sm:pb-4 border-b border-primary/10">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded-sm animate-pulse" />
                    <div className="font-label-mono text-on-surface text-xs sm:text-sm tracking-wider">ANALYZING: txn_000102</div>
                  </div>
                  <span className="material-symbols-outlined text-primary/70 animate-spin-slow text-lg sm:text-2xl">radar</span>
                </div>
                <div className="space-y-2 sm:space-y-4 font-label-mono text-xs sm:text-sm mb-4 sm:mb-8">
                  <div className="flex justify-between items-center p-2.5 sm:p-3 rounded bg-surface/50 border border-white/5">
                    <span className="text-on-surface-variant/70 text-[11px] sm:text-xs">LATENCY_DELTA</span>
                    <span className="text-error bg-error/10 px-2 py-0.5 sm:py-1 rounded border border-error/20 text-[11px] sm:text-xs">+412ms</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 sm:p-3 rounded bg-surface/50 border border-white/5">
                    <span className="text-on-surface-variant/70 text-[11px] sm:text-xs">GATEWAY</span>
                    <span className="text-on-surface text-[11px] sm:text-xs">Razorpay (Test)</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 sm:p-3 rounded bg-surface/50 border border-white/5">
                    <span className="text-on-surface-variant/70 text-[11px] sm:text-xs">HISTORY</span>
                    <span className="text-on-surface text-[11px] sm:text-xs">99.9% SUCCESS RATE</span>
                  </div>
                </div>
                <div className="border-t border-primary/20 pt-4 sm:pt-6">
                  <div className="font-label-mono text-primary mb-3 sm:mb-4 text-[10px] sm:text-xs tracking-widest">DIAGNOSTIC RESULT</div>
                  <div className="flex flex-col md:flex-row gap-3 sm:gap-4 justify-between">
                    <div className="bg-primary/5 border border-primary/20 p-3 sm:p-4 rounded flex-1">
                      <div className="text-on-surface-variant/70 text-[9px] sm:text-[10px] mb-1">Diagnosis</div>
                      <div className="text-primary font-bold text-xs sm:text-sm">TEMPORARY_GATEWAY_FAILURE</div>
                    </div>
                    <div className="flex gap-3 sm:gap-4 flex-1">
                      <div className="bg-primary/5 border border-primary/20 p-3 sm:p-4 rounded flex-1">
                        <div className="text-on-surface-variant/70 text-[9px] sm:text-[10px] mb-1">Recovery prob</div>
                        <div className="text-on-surface font-bold text-xs sm:text-sm">92%</div>
                      </div>
                      <div className="bg-primary/5 border border-primary/20 p-3 sm:p-4 rounded flex-1">
                        <div className="text-on-surface-variant/70 text-[9px] sm:text-[10px] mb-1">Confidence</div>
                        <div className="text-on-surface font-bold text-xs sm:text-sm">95%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 03 / DECISION */}
          <div className="chapter-layer" id="layer-3">
            <div className="max-w-5xl mx-auto px-4 sm:px-8 w-full text-center">
              <span className="font-label-mono text-primary text-[9px] sm:text-[10px] tracking-widest border border-primary/30 bg-primary/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded mb-3 sm:mb-6 inline-block backdrop-blur-sm">
                03 / DECISION ENGINE
              </span>
              <h2 className="font-headline-lg text-2xl sm:text-4xl md:text-[56px] text-on-surface mb-6 sm:mb-10 md:mb-12 font-semibold">
                Intelligent Routing
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-center">
                {/* Left indicators */}
                <div className="grid grid-cols-3 md:grid-cols-1 gap-2 sm:gap-3 md:gap-4 text-left font-label-mono text-[10px] sm:text-xs">
                  <div className="p-2 sm:p-3 border border-white/10 rounded bg-surface-container/50">
                    <span className="text-on-surface-variant/70 block mb-0.5 sm:mb-1">Load</span>
                    <span className="text-secondary font-bold">NORMAL</span>
                  </div>
                  <div className="p-2 sm:p-3 border border-white/10 rounded bg-surface-container/50">
                    <span className="text-on-surface-variant/70 block mb-0.5 sm:mb-1">History</span>
                    <span className="text-on-surface font-bold">CLEAN</span>
                  </div>
                  <div className="p-2 sm:p-3 border border-white/10 rounded bg-surface-container/50">
                    <span className="text-on-surface-variant/70 block mb-0.5 sm:mb-1">Risk</span>
                    <span className="text-secondary font-bold">LOW</span>
                  </div>
                </div>

                {/* Animated Ring Center */}
                <div className="relative w-36 h-36 sm:w-48 sm:h-48 md:w-64 md:h-64 mx-auto flex items-center justify-center my-2 md:my-0">
                  <div className="absolute inset-0 rounded-full border border-primary/30 border-dashed animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-3 sm:inset-4 rounded-full border border-primary/10 animate-[spin_15s_linear_infinite_reverse]" />
                  <div className="font-headline-lg text-primary drop-shadow-[0_0_30px_rgba(91,91,247,0.6)] tracking-tighter text-2xl sm:text-3xl md:text-[48px] flex flex-col items-center">
                    <span>RETRY</span>
                    <span className="text-[9px] sm:text-xs font-label-mono text-primary/70 tracking-widest mt-1 sm:mt-2 uppercase">Action Selected</span>
                  </div>
                </div>

                {/* Right confidence */}
                <div className="grid grid-cols-2 md:grid-cols-1 gap-2 sm:gap-3 md:gap-4 text-left md:text-right font-label-mono text-[10px] sm:text-xs">
                  <div className="p-2.5 sm:p-4 border border-primary/30 rounded bg-primary/5">
                    <span className="text-primary/70 block mb-0.5 sm:mb-1">Confidence</span>
                    <span className="text-primary font-bold text-sm sm:text-lg">95%</span>
                  </div>
                  <div className="p-2.5 sm:p-4 border border-primary/30 rounded bg-primary/5">
                    <span className="text-primary/70 block mb-0.5 sm:mb-1">Recovery Prob</span>
                    <span className="text-primary font-bold text-sm sm:text-lg">92%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 04 / EXECUTION */}
          <div className="chapter-layer" id="layer-4">
            <div
              className="w-full h-full absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(91,91,247,0.05)_0%,transparent_70%)] pointer-events-auto"
              id="threejs-container"
            />
            <div className="absolute top-20 sm:top-28 md:top-32 left-0 w-full text-center z-10 pointer-events-none px-4">
              <span className="font-label-mono text-primary text-[9px] sm:text-[10px] tracking-widest border border-primary/30 bg-surface-container-high/80 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded inline-block shadow-lg mb-4 sm:mb-6">
                04 / EXECUTION PIPELINE
              </span>
              <div className="max-w-[340px] sm:max-w-md mx-auto bg-surface-container-high/90 backdrop-blur-xl border border-primary/30 p-4 sm:p-6 rounded-lg font-label-mono text-xs sm:text-sm text-left shadow-2xl">
                <div className="flex justify-between items-center mb-3 sm:mb-4 border-b border-white/10 pb-2">
                  <span className="text-on-surface font-bold">Attempt #1</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-primary text-[11px] sm:text-xs">EXECUTING</span>
                  </div>
                </div>
                <div className="space-y-2 sm:space-y-3 text-[11px] sm:text-xs">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant/70">Target</span>
                    <span className="text-on-surface">txn_000102</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant/70">Strategy</span>
                    <span className="text-primary font-bold">RETRY</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant/70">Gateway</span>
                    <span className="text-on-surface">Razorpay TEST MODE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 05 / VERIFICATION */}
          <div className="chapter-layer" id="layer-5">
            <div className="w-full max-w-3xl mx-auto px-4 sm:px-8">
              <div className="text-center mb-4 sm:mb-8 md:mb-12">
                <span className="font-label-mono text-secondary text-[9px] sm:text-[10px] tracking-widest border border-secondary/30 bg-secondary/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded mb-3 sm:mb-6 inline-block">
                  05 / VERIFICATION
                </span>
                <h3 className="font-headline-md text-on-surface text-xl sm:text-2xl md:text-[32px] font-semibold">
                  Execution success &#8800; payment recovered
                </h3>
                <p className="font-label-mono text-on-surface-variant mt-1 sm:mt-3 md:mt-4 text-xs sm:text-sm">
                  Recovery claims need evidence.
                </p>
              </div>
              <div className="bg-surface-container-highest/60 border border-white/10 rounded-xl p-4 sm:p-6 md:p-8 backdrop-blur-md font-label-mono">
                <div className="space-y-3 sm:space-y-5 md:space-y-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 border border-secondary/30 mt-0.5 sm:mt-1">
                      <span className="material-symbols-outlined text-secondary text-xs sm:text-sm">verified</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-on-surface font-bold text-xs sm:text-sm mb-0.5 sm:mb-1">VERIFIED WEBHOOK</div>
                      <div className="text-secondary text-[10px] sm:text-xs">&#10003; Signature verified</div>
                    </div>
                    <div className="text-right text-[10px] sm:text-xs text-on-surface-variant/70">razorpay.payment.captured</div>
                  </div>
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 border border-secondary/30 mt-0.5 sm:mt-1">
                      <span className="material-symbols-outlined text-secondary text-xs sm:text-sm">fact_check</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-on-surface font-bold text-xs sm:text-sm mb-2 sm:mb-3">PAYMENT EVIDENCE</div>
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                        <div className="flex justify-between bg-surface/50 p-1.5 sm:p-2 rounded">
                          <span className="text-on-surface-variant/70">Txn</span>
                          <span className="text-secondary">MATCHED</span>
                        </div>
                        <div className="flex justify-between bg-surface/50 p-1.5 sm:p-2 rounded">
                          <span className="text-on-surface-variant/70">Amount</span>
                          <span className="text-secondary">MATCHED</span>
                        </div>
                        <div className="flex justify-between bg-surface/50 p-1.5 sm:p-2 rounded">
                          <span className="text-on-surface-variant/70">Status</span>
                          <span className="text-secondary">CAPTURED</span>
                        </div>
                        <div className="flex justify-between bg-surface/50 p-1.5 sm:p-2 rounded">
                          <span className="text-on-surface-variant/70">Correlation</span>
                          <span className="text-secondary">MATCHED</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="flex items-center justify-between bg-secondary/5 border border-secondary/20 p-2.5 sm:p-4 rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="material-symbols-outlined text-secondary text-sm sm:text-base">sync_alt</span>
                      <span className="text-on-surface font-bold text-xs sm:text-sm">RECONCILIATION</span>
                    </div>
                    <span className="text-secondary font-bold tracking-widest text-xs sm:text-sm bg-secondary/10 px-2 sm:px-3 py-0.5 sm:py-1 rounded">SYNCED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 06 / RECOVERY */}
          <div className="chapter-layer" id="layer-6">
            <div className="text-center relative px-4">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-96 h-64 sm:h-96 bg-secondary/20 rounded-full blur-[80px] sm:blur-[100px] -z-10" />
              <span className="font-label-mono text-secondary text-[9px] sm:text-[10px] tracking-widest border border-secondary/30 bg-secondary/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded mb-4 sm:mb-8 inline-block">
                06 / RESOLUTION
              </span>
              <h2 className="font-display-hero text-5xl sm:text-7xl md:text-[100px] lg:text-[140px] text-secondary mb-2 leading-none tracking-tighter drop-shadow-[0_0_60px_rgba(53,211,154,0.4)] font-bold">
                RECOVERED
              </h2>
              <div className="font-display-hero text-2xl sm:text-4xl md:text-display-hero-mobile text-on-surface mb-4 sm:mb-8 font-bold">
                &#8377;18,000
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center items-center mb-6 sm:mb-12 font-label-mono text-[10px] sm:text-xs">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-surface-container/50 border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded w-full sm:w-auto justify-center">
                  <span className="material-symbols-outlined text-secondary text-[14px] sm:text-[16px]">check_circle</span>
                  <span>PAYMENT VERIFIED</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 bg-surface-container/50 border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded w-full sm:w-auto justify-center">
                  <span className="material-symbols-outlined text-secondary text-[14px] sm:text-[16px]">account_balance_wallet</span>
                  <span>LEDGER RECONCILED</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 bg-surface-container/50 border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded w-full sm:w-auto justify-center">
                  <span className="text-on-surface-variant/70">ID:</span>
                  <span className="text-on-surface">txn_000102</span>
                </div>
              </div>
            </div>
          </div>

          {/* 07 / ARCHITECTURE */}
          <div className="chapter-layer" id="layer-7">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 w-full">
              <div className="text-center mb-4 sm:mb-8 md:mb-12">
                <span className="font-label-mono text-primary text-[9px] sm:text-[10px] tracking-widest border border-primary/30 bg-primary/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded mb-2 sm:mb-4 inline-block">
                  07 / ARCHITECTURE
                </span>
                <h3 className="font-headline-md text-on-surface text-lg sm:text-2xl md:text-[32px] font-semibold leading-tight">
                  An autonomous recovery system has to stay healthy.
                </h3>
                <p className="font-label-mono text-on-surface-variant mt-1 sm:mt-3 text-xs sm:text-sm">
                  Built for financial systems.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 md:gap-12">
                {/* Telemetry */}
                <div className="bg-surface-container-highest/40 border border-white/10 rounded-xl p-3.5 sm:p-5 md:p-6 backdrop-blur-md">
                  <h4 className="font-label-mono text-xs sm:text-sm text-primary mb-3 sm:mb-6 border-b border-white/10 pb-1.5 sm:pb-2">
                    SYSTEM TELEMETRY
                  </h4>
                  <div className="space-y-2 sm:space-y-3 font-label-mono text-[11px] sm:text-xs">
                    <div className="flex justify-between items-center bg-surface/50 p-2 sm:p-3 rounded border border-white/5">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-secondary" />
                        <span className="text-on-surface">PostgreSQL (Primary)</span>
                      </div>
                      <span className="text-secondary">99.99% Uptime</span>
                    </div>
                    <div className="flex justify-between items-center bg-surface/50 p-2 sm:p-3 rounded border border-white/5">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-secondary" />
                        <span className="text-on-surface">Redis Cache</span>
                      </div>
                      <span className="text-secondary">0.4ms latency</span>
                    </div>
                    <div className="flex justify-between items-center bg-surface/50 p-2 sm:p-3 rounded border border-white/5">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-secondary" />
                        <span className="text-on-surface">Webhook Workers</span>
                      </div>
                      <span className="text-on-surface-variant/70">48 instances</span>
                    </div>
                    {/* Fallback Engine */}
                    <div className="mt-3 sm:mt-6 pt-2 sm:pt-4 border-t border-white/10">
                      <div className="text-[9px] sm:text-[10px] text-on-surface-variant/70 mb-1.5 sm:mb-3">
                        Recovery intelligence shouldn&apos;t depend on one model.
                      </div>
                      <div className="relative overflow-hidden rounded border border-primary/20 bg-primary/5 p-2 sm:p-3">
                        <div className="flex justify-between items-center mb-1 sm:mb-2">
                          <span className="text-on-surface font-bold text-[10px] sm:text-xs">Gemini 1.5 Pro</span>
                          <span className="text-error text-[9px] sm:text-[10px] bg-error/10 px-1.5 py-0.5 rounded border border-error/20">DEGRADED</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-primary text-[10px] sm:text-xs">Fallback Engine</span>
                          <span className="text-secondary text-[9px] sm:text-[10px] bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/20">ACTIVE (70% conf)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Architecture Principles */}
                <div className="bg-surface-container-highest/40 border border-white/10 rounded-xl p-3.5 sm:p-5 md:p-6 backdrop-blur-md">
                  <h4 className="font-label-mono text-xs sm:text-sm text-primary mb-3 sm:mb-6 border-b border-white/10 pb-1.5 sm:pb-2">
                    FINANCIAL INTEGRITY
                  </h4>
                  <div className="space-y-3 sm:space-y-5 md:space-y-6">
                    <div className="flex gap-2.5 sm:gap-4">
                      <span className="material-symbols-outlined text-primary/70 text-lg sm:text-2xl shrink-0">shield</span>
                      <div>
                        <div className="font-label-mono text-xs sm:text-sm text-on-surface font-bold mb-0.5 sm:mb-1">Tenant Isolation</div>
                        <div className="font-body-md text-[11px] sm:text-sm text-on-surface-variant/70">Strict logical separation of data across all operational boundaries.</div>
                      </div>
                    </div>
                    <div className="flex gap-2.5 sm:gap-4">
                      <span className="material-symbols-outlined text-primary/70 text-lg sm:text-2xl shrink-0">repeat</span>
                      <div>
                        <div className="font-label-mono text-xs sm:text-sm text-on-surface font-bold mb-0.5 sm:mb-1">Idempotent Execution</div>
                        <div className="font-body-md text-[11px] sm:text-sm text-on-surface-variant/70">Guaranteed exactly-once processing for all recovery attempts.</div>
                      </div>
                    </div>
                    <div className="flex gap-2.5 sm:gap-4">
                      <span className="material-symbols-outlined text-primary/70 text-lg sm:text-2xl shrink-0">history</span>
                      <div>
                        <div className="font-label-mono text-xs sm:text-sm text-on-surface font-bold mb-0.5 sm:mb-1">Cryptographic Audit Trail</div>
                        <div className="font-body-md text-[11px] sm:text-sm text-on-surface-variant/70">Immutable log of every diagnostic decision and execution attempt.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 08 / SANDBOX */}
          <div className="chapter-layer" id="layer-8">
            <div className="text-center max-w-4xl mx-auto px-4 sm:px-8 w-full">
              <span className="font-label-mono text-primary text-[9px] sm:text-[10px] tracking-widest border border-primary/30 bg-primary/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded mb-3 sm:mb-6 inline-block">
                08 / RECOVERY CENTER
              </span>
              <h2 className="font-headline-lg text-xl sm:text-3xl md:text-[48px] text-on-surface mb-4 sm:mb-8 font-semibold leading-tight">
                Stop writing off recoverable revenue.
              </h2>
              <div className="bg-surface-container-highest/80 border border-white/10 rounded-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-8 backdrop-blur-xl shadow-2xl relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 sm:pb-4 mb-3 sm:mb-6">
                  <div className="font-label-mono text-xs sm:text-sm text-on-surface">Overview</div>
                  <div className="font-label-mono text-[10px] sm:text-xs text-on-surface-variant/70">Last 30 Days</div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 font-label-mono mb-4 sm:mb-8">
                  <div>
                    <div className="text-[9px] sm:text-[10px] text-on-surface-variant/70 mb-1 sm:mb-2">Recovery Opp</div>
                    <div className="text-sm sm:text-lg md:text-xl text-on-surface font-bold">&#8377;1.38 Cr</div>
                  </div>
                  <div>
                    <div className="text-[9px] sm:text-[10px] text-on-surface-variant/70 mb-1 sm:mb-2">Recovered</div>
                    <div className="text-sm sm:text-lg md:text-xl text-secondary font-bold">&#8377;28.4 L</div>
                  </div>
                  <div>
                    <div className="text-[9px] sm:text-[10px] text-on-surface-variant/70 mb-1 sm:mb-2">Recovery Rate</div>
                    <div className="text-sm sm:text-lg md:text-xl text-primary font-bold">20.5%</div>
                  </div>
                </div>
                <div className="text-center pt-3 sm:pt-6 border-t border-white/10">
                  <button
                    onClick={() => navigate("/login")}
                    className="bg-primary hover:bg-primary-fixed hover:text-surface-dim text-surface-dim font-label-mono text-xs sm:text-sm tracking-wider sm:tracking-widest px-6 sm:px-12 py-3 sm:py-4 rounded transition-all shadow-[0_0_40px_rgba(193,193,255,0.4)] hover:scale-105 transform pointer-events-auto w-full md:w-auto"
                  >
                    ENTER DEMO SANDBOX
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
};

export default LandingPage;
