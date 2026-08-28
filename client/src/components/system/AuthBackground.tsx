import React from 'react';

interface AuthBackgroundProps {
  children: React.ReactNode;
  maxWidth?: string;
}

export const AuthBackground: React.FC<AuthBackgroundProps> = ({ children, maxWidth = 'max-w-md' }) => {
  return (
    <div className="min-h-[90vh] flex flex-col justify-center items-center px-4 py-12 relative font-mono overflow-hidden">
      {/* Background Image Layer - Bright, clear, with sleek depth blur */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Background Network Image - Vibrant & Bright */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105 filter blur-[4px] opacity-95 brightness-125 contrast-110"
          style={{ backgroundImage: `url('/assets/auth-bg.jpg')` }}
        />

        {/* Soft, Transparent Radial Tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B17]/20 via-[#070B17]/15 to-[#070B17]/40" />

        {/* Vibrant Glowing Ambient Spotlight directly behind card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] rounded-full bg-gradient-to-tr from-[#5b5bf7]/35 via-[#3b82f6]/25 to-[#10b981]/20 blur-[100px] opacity-90 animate-pulse" />

        {/* Fine Technical Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-35" />

        {/* Subtle Edge Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,#070B17_98%)] opacity-50" />
      </div>

      {/* Foreground card content with high z-index */}
      <div className={`w-full ${maxWidth} space-y-8 relative z-10`}>
        {children}
      </div>
    </div>
  );
};

export default AuthBackground;
