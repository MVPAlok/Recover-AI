import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { getActiveMerchantId, clearSession } from '../services/api';
import { StatusIndicator } from '../components/system/StatusIndicator';

export const PublicLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [authStatus, setAuthStatus] = useState<string | null>(getActiveMerchantId());

  const handleSignOut = () => {
    clearSession();
    setAuthStatus(null);
    navigate('/');
  };

  const navLinks = [
    { label: 'Capabilities', path: '/features' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Security', path: '/security' },
  ];

  return (
    <div className="min-h-screen bg-[#070B17] text-[#dee1f9] flex flex-col font-geist antialiased selection:bg-primary/20 selection:text-white">
      {/* ========================================================================= */}
      {/* Top Navigation Bar matching LandingPage.tsx */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#070B17]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <NavLink to="/" className="flex items-center gap-3">
            <span className="font-bold text-lg sm:text-xl text-white tracking-tight">
              RecoverAI
            </span>
          </NavLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 font-mono text-xs">
            {navLinks.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `tracking-wider uppercase transition-colors ${
                    isActive ? 'text-primary font-bold' : 'text-on-surface-variant/70 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="flex items-center gap-2 text-on-surface-variant/60">
              <StatusIndicator status="OPERATIONAL" label="SYSTEM READY" />
            </div>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4 font-mono text-xs">
            {authStatus ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-primary/10 text-primary border border-primary/30 text-xs px-4 py-2 rounded hover:bg-primary hover:text-surface-dim transition-all uppercase tracking-wider font-bold"
                >
                  ENTER CONSOLE &rarr;
                </button>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="text-on-surface-variant/60 hover:text-error transition-colors text-[11px]"
                >
                  EXIT
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <NavLink
                  to="/login"
                  className="text-on-surface-variant/80 hover:text-white transition-colors"
                >
                  Sign In
                </NavLink>
                <NavLink
                  to="/signup"
                  className="bg-primary/10 text-primary border border-primary/30 text-xs px-4 py-2 rounded hover:bg-primary hover:text-surface-dim transition-all uppercase tracking-wider font-bold"
                >
                  Enter Sandbox
                </NavLink>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded text-on-surface hover:bg-surface/50 border border-white/10"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-[#070B17] px-4 pt-3 pb-6 space-y-3 font-mono text-xs">
            <nav className="space-y-1">
              {navLinks.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded text-on-surface-variant hover:text-white"
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              {authStatus ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/dashboard');
                  }}
                  className="w-full py-2.5 rounded bg-primary/10 text-primary border border-primary/30 font-bold uppercase tracking-wider text-center"
                >
                  Enter Console &rarr;
                </button>
              ) : (
                <NavLink
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded bg-primary/10 text-primary border border-primary/30 font-bold uppercase tracking-wider text-center"
                >
                  Enter Sandbox
                </NavLink>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Public Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Enterprise Technical Footer */}
      <footer className="border-t border-white/10 bg-[#070B17] pt-14 pb-12 font-mono text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
            {/* Brand Column */}
            <div className="space-y-3 md:col-span-1">
              <span className="font-bold text-base text-white">RecoverAI</span>
              <p className="text-on-surface-variant/60 leading-relaxed text-[11px]">
                Autonomous revenue recovery platform isolating, diagnosing, and executing transaction recovery.
              </p>
              <div className="inline-block px-2 py-0.5 rounded bg-primary/5 border border-primary/20 text-primary text-[10px]">
                STRICT TEST MODE SANDBOX
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="font-bold uppercase text-on-surface text-[11px] mb-3">Product</h4>
              <ul className="space-y-2 text-on-surface-variant/70 text-[11px]">
                <li><NavLink to="/features" className="hover:text-primary transition-colors">Capabilities</NavLink></li>
                <li><NavLink to="/how-it-works" className="hover:text-primary transition-colors">6-Stage Engine</NavLink></li>
                <li><NavLink to="/security" className="hover:text-primary transition-colors">Security & Isolation</NavLink></li>
                <li><NavLink to="/dashboard" className="hover:text-primary transition-colors">Recovery Console</NavLink></li>
              </ul>
            </div>

            {/* Architecture Column */}
            <div>
              <h4 className="font-bold uppercase text-on-surface text-[11px] mb-3">Architecture</h4>
              <ul className="space-y-2 text-on-surface-variant/70 text-[11px]">
                <li><NavLink to="/dashboard" className="hover:text-primary transition-colors">Telemetry Board</NavLink></li>
                <li><NavLink to="/security" className="hover:text-primary transition-colors">Evidence Ledger</NavLink></li>
                <li>
                  <a
                    href="https://github.com/MVPAlok/Recover_AI"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary transition-colors flex items-center gap-1"
                  >
                    GitHub Source <ExternalLink className="w-3 h-3 text-on-surface-variant/50" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Security Column */}
            <div>
              <h4 className="font-bold uppercase text-on-surface text-[11px] mb-3">Governance</h4>
              <ul className="space-y-2 text-on-surface-variant/70 text-[11px]">
                <li><span className="text-on-surface-variant/60">Multi-Tenant RBAC</span></li>
                <li><span className="text-on-surface-variant/60">Timing-Safe HMAC SHA-256</span></li>
                <li><span className="text-on-surface-variant/60">Deterministic Fallbacks</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-on-surface-variant/50 text-[11px] gap-4">
            <div>&copy; {new Date().getFullYear()} RecoverAI. Financial recovery operating system.</div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                Ledger Reconciled Invariant
              </span>
              <span className="flex items-center gap-1.5 text-primary">
                <Lock className="w-3 h-3 text-primary" />
                Zero Secret Leakage
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
