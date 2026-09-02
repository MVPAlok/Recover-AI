import React, { useEffect, useState } from 'react';

interface InitialLoaderProps {
  onComplete?: () => void;
  minDuration?: number; // Duration in ms before auto-completing
}

const TELEMETRY_STEPS = [
  { text: 'INITIALIZING RECOVER_AI NEURAL CORE...', code: '0x01_BOOT_OK' },
  { text: 'ESTABLISHING SECURE GATEWAY TELEMETRY [RZP / STRIPE]...', code: '0x02_MESH_SYNC' },
  { text: 'ISOLATING RECOVERABLE TRANSACTION SIGNALS...', code: '0x03_SIG_DETECT' },
  { text: 'CALIBRATING AUTONOMOUS RECOVERY AGENTS...', code: '0x04_AGENTS_READY' },
  { text: 'NEURAL DECISION MATRIX OPERATIONAL. READY.', code: '0x05_SYSTEM_ONLINE' },
];

export const InitialLoader: React.FC<InitialLoaderProps> = ({
  onComplete,
  minDuration = 2200,
}) => {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [hexCode, setHexCode] = useState('0x7F9B...4C12');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Generate randomized hex streams
  useEffect(() => {
    const hexInterval = setInterval(() => {
      const chars = '0123456789ABCDEF';
      let randHex = '0x';
      for (let i = 0; i < 4; i++) randHex += chars[Math.floor(Math.random() * chars.length)];
      randHex += '...';
      for (let i = 0; i < 4; i++) randHex += chars[Math.floor(Math.random() * chars.length)];
      setHexCode(randHex);
    }, 120);

    return () => clearInterval(hexInterval);
  }, []);

  // Progress counter and step sequence
  useEffect(() => {
    const startTime = performance.now();

    const frame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(100, Math.floor((elapsed / minDuration) * 100));

      setProgress(rawProgress);

      // Map progress to telemetry steps
      const currentStep = Math.min(
        TELEMETRY_STEPS.length - 1,
        Math.floor((rawProgress / 100) * TELEMETRY_STEPS.length)
      );
      setStepIndex(currentStep);

      if (rawProgress < 100) {
        requestAnimationFrame(frame);
      } else {
        // Trigger exit sequence
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setIsDismissed(true);
            if (onComplete) onComplete();
          }, 650);
        }, 300);
      }
    };

    const animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [minDuration, onComplete]);

  // Handle manual skip on Space or Escape or click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        finishFast();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const finishFast = () => {
    if (isFadingOut || isDismissed) return;
    setProgress(100);
    setStepIndex(TELEMETRY_STEPS.length - 1);
    setIsFadingOut(true);
    setTimeout(() => {
      setIsDismissed(true);
      if (onComplete) onComplete();
    }, 400);
  };

  if (isDismissed) return null;

  return (
    <div
      onClick={finishFast}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070B17] text-[#dee1f9] select-none cursor-pointer overflow-hidden transition-all duration-700 ease-out ${isFadingOut
          ? 'opacity-0 scale-105 pointer-events-none filter blur-[6px]'
          : 'opacity-100 scale-100'
        }`}
      style={{
        background: 'radial-gradient(ellipse at center, #0e162e 0%, #070B17 70%, #03060d 100%)',
      }}
    >
      {/* Background Matrix Grid & Glows */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(91,91,247,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(91,91,247,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#5B5BF7]/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      {/* Top Header Badge */}
      <div className="absolute top-8 left-8 sm:left-12 flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-[#5B5BF7] animate-ping" />
        <span className="font-mono text-xs sm:text-sm tracking-[0.25em] font-semibold text-white uppercase">
          RecoverAI
        </span>
        <span className="hidden sm:inline-block font-mono text-[10px] text-[#c1c1ff]/60 border border-[#5B5BF7]/30 px-2 py-0.5 rounded bg-[#5B5BF7]/10">
          AUTONOMOUS ENGINE v2.4
        </span>
      </div>

      <div className="absolute top-8 right-8 sm:right-12 font-mono text-[11px] text-[#c1c1ff]/70 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="tracking-widest">SIGNAL_MESH: ACTIVE</span>
      </div>

      {/* Centerpiece: Hologram Orbital Core */}
      <div className="relative flex flex-col items-center justify-center my-auto">
        {/* Multi-layered Rotating Gyro Rings */}
        <div className="relative w-48 h-48 sm:w-60 sm:h-60 flex items-center justify-center">
          {/* Outer dashed ring - spins clockwise */}
          <div
            className="absolute inset-0 rounded-full border border-dashed border-[#5B5BF7]/40 animate-[spin_12s_linear_infinite]"
            style={{ animationDirection: 'normal' }}
          />

          {/* Secondary rotating segmented ring - spins counter-clockwise */}
          <div
            className="absolute inset-3 rounded-full border-2 border-t-[#c1c1ff] border-r-transparent border-b-[#5B5BF7]/60 border-l-transparent animate-[spin_6s_linear_infinite]"
            style={{ animationDirection: 'reverse' }}
          />

          {/* Glowing Target Crosshairs */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#5B5BF7]/30 to-transparent" />
            <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-[#5B5BF7]/30 to-transparent" />
          </div>

          {/* SVG Circular Progress Meter */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className="stroke-[#5B5BF7]/20"
              strokeWidth="3"
              fill="transparent"
            />
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className="stroke-[#c1c1ff] transition-all duration-150 ease-out"
              strokeWidth="4"
              strokeDasharray={2 * Math.PI * 105}
              strokeDashoffset={2 * Math.PI * 105 * (1 - progress / 100)}
              strokeLinecap="round"
              fill="transparent"
              style={{
                filter: 'drop-shadow(0 0 12px rgba(193,193,255,0.7))',
              }}
            />
          </svg>

          {/* Center Neural Icon with pulsing wave aura */}
          <div className="relative z-10 flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#0a1024]/90 border border-[#5B5BF7]/50 shadow-[0_0_35px_rgba(91,91,247,0.35)] backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5B5BF7]/30 to-[#c1c1ff]/20 flex items-center justify-center border border-[#c1c1ff]/40 shadow-inner">
              <svg
                className="w-7 h-7 text-[#c1c1ff] animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="mt-1 font-mono text-[9px] text-[#c1c1ff] font-bold tracking-widest">
              AI_REC
            </div>
          </div>
        </div>

        {/* Dynamic Equalizer Waveform Bars */}
        <div className="flex items-end justify-center gap-1.5 h-7 mt-8 mb-4">
          {[40, 75, 55, 90, 100, 65, 80, 45, 95, 70, 85, 50, 90, 60, 75, 45].map((baseHeight, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-[#5B5BF7] to-[#c1c1ff] rounded-full transition-all duration-150"
              style={{
                height: `${Math.max(15, (baseHeight * (progress / 100) + Math.sin(Date.now() / 150 + i) * 20))}%`,
                opacity: 0.4 + ((i % 4) * 0.15),
                boxShadow: progress > 50 ? '0 0 8px rgba(193,193,255,0.5)' : 'none',
              }}
            />
          ))}
        </div>

        {/* Big Monospace Percentage Counter */}
        <div className="flex items-baseline gap-1 mt-1">
          <span className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-white drop-shadow-[0_0_20px_rgba(193,193,255,0.5)]">
            {String(progress).padStart(3, '0')}
          </span>
          <span className="font-mono text-xl sm:text-2xl text-[#5B5BF7] font-semibold">%</span>
        </div>

        {/* Active Telemetry Ticker */}
        <div className="mt-4 flex flex-col items-center max-w-md px-4 text-center">
          <div className="flex items-center gap-2 font-mono text-xs sm:text-sm text-[#c1c1ff] tracking-wider min-h-[24px]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#5B5BF7] animate-ping" />
            <span className="text-white font-medium">{TELEMETRY_STEPS[stepIndex]?.text}</span>
          </div>

          <div className="flex items-center gap-4 mt-2 font-mono text-[10px] sm:text-[11px] text-[#c1c1ff]/60">
            <span>PACKET: <span className="text-emerald-400 font-semibold">{hexCode}</span></span>
            <span>•</span>
            <span>STAGE: <span className="text-white font-semibold">0{stepIndex + 1}/05</span></span>
            <span>•</span>
            <span>LATENCY: <span className="text-emerald-400">12ms</span></span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Telemetry & Skip Button */}
      <div className="absolute bottom-8 left-8 right-8 sm:left-12 sm:right-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-4 text-center sm:text-left">
        <div className="font-mono text-[10px] text-[#c1c1ff]/50 tracking-wider">
          AUTONOMOUS PAYMENT RECOVERY PLATFORM • SECURED VIA ENCRYPTED WEBHOOK MESH
        </div>
        <div className="font-mono text-[11px] text-[#c1c1ff]/80 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded transition-colors flex items-center gap-2">
          <span>Click anywhere or press</span>
          <kbd className="bg-[#5B5BF7]/30 border border-[#5B5BF7]/50 text-white px-1.5 py-0.5 rounded text-[10px]">
            SPACE
          </kbd>
          <span>to skip</span>
        </div>
      </div>
    </div>
  );
};

export default InitialLoader;
