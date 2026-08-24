import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Zap,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { getActiveMerchantId } from '../services/api';

export const PublicLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const isAuthenticated = Boolean(getActiveMerchantId());

  const handleCtaClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  const navLinks = [
    { label: 'Features', path: '/features' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Security', path: '/security' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white">
      {/* ========================================================================= */}
      {/* Top Navigation Bar */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                RecoverAI
              </span>
              <span className="text-[10px] block font-mono text-emerald-400 -mt-1 font-medium tracking-wide">
                REVENUE ENGINE
              </span>
            </div>
          </NavLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href="/#system-health"
              className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              System Status
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold transition-all shadow-sm"
              >
                Open Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition-all"
                >
                  Sign In
                </NavLink>
                <button
                  onClick={handleCtaClick}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-900/30 active:scale-95"
                >
                  Get Started
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-slate-950/95 px-4 pt-3 pb-5 space-y-3">
            <nav className="space-y-1">
              {navLinks.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
                >
                  {item.label}
                </NavLink>
              ))}
              <a
                href="/#system-health"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
              >
                System Status
              </a>
            </nav>
            <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/dashboard');
                  }}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  Open Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2 rounded-lg text-center text-xs font-semibold text-slate-300 hover:bg-slate-900 border border-slate-800"
                  >
                    Sign In
                  </NavLink>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleCtaClick();
                    }}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-900/30"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* Main Public Content */}
      {/* ========================================================================= */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ========================================================================= */}
      {/* Enterprise Footer */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-800/80 bg-slate-950 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
            {/* Brand Column */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  <Zap className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <span className="font-bold text-base tracking-tight text-white">RecoverAI</span>
                  <span className="text-[10px] block font-mono text-emerald-400 -mt-1 font-medium">
                    REVENUE ENGINE
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Autonomous revenue recovery platform that detects failed transactions, diagnoses root causes with AI, executes safe policy actions, and reconciles recovered revenue with cryptographic payment evidence.
              </p>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                SANDBOX ENVIRONMENT: RAZORPAY TEST MODE
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">Product</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <NavLink to="/features" className="hover:text-slate-200 transition-colors">
                    Core Capabilities
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/how-it-works" className="hover:text-slate-200 transition-colors">
                    6-Stage Recovery Engine
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/security" className="hover:text-slate-200 transition-colors">
                    Security & Guardrails
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/dashboard" className="hover:text-slate-200 transition-colors">
                    Merchant Dashboard
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Architecture Column */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">Architecture</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a href="/#lifecycle-demo" className="hover:text-slate-200 transition-colors">
                    Decision Lifecycle
                  </a>
                </li>
                <li>
                  <a href="/#evidence-ledger" className="hover:text-slate-200 transition-colors">
                    Payment Evidence Ledger
                  </a>
                </li>
                <li>
                  <a href="/#system-health" className="hover:text-slate-200 transition-colors">
                    Telemetry & Observability
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/MVPAlok/Recover_AI"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-slate-200 transition-colors flex items-center gap-1"
                  >
                    GitHub Repository
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Trust & Legal Column */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">Trust & Policy</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <NavLink to="/security" className="hover:text-slate-200 transition-colors">
                    Multi-Tenant RBAC
                  </NavLink>
                </li>
                <li>
                  <span className="text-slate-500 cursor-not-allowed">HMAC SHA-256 Webhooks</span>
                </li>
                <li>
                  <span className="text-slate-500 cursor-not-allowed">MIT Open Source License</span>
                </li>
                <li>
                  <span className="text-slate-500 cursor-not-allowed">Privacy & Terms</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div>
              &copy; {new Date().getFullYear()} RecoverAI. Built for high-reliability merchant revenue recovery.
            </div>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Zero False Positives Invariant
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Strict Test Sandbox
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
