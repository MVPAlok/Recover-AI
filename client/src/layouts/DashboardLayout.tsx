import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { fetchMerchants, setActiveMerchantId, getActiveMerchantId, clearSession } from '../services/api';
import { Merchant } from '../types';
import { StatusIndicator } from '../components/system/StatusIndicator';

export const DashboardLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null);
  const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMerchants()
      .then((data) => {
        setMerchants(data);
        const storedId = getActiveMerchantId();
        const current = data.find((m) => m.id === storedId) || data[0] || null;
        setActiveMerchant(current);
        if (current) {
          setActiveMerchantId(current.id);
        }
      })
      .catch((err) => console.error('Failed to load merchants', err));
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSelectMerchant = (m: Merchant) => {
    setActiveMerchant(m);
    setActiveMerchantId(m.id);
    setMerchantDropdownOpen(false);
    window.location.reload();
  };

  const navItems = [
    { num: '01', label: 'OVERVIEW', path: '/dashboard' },
    { num: '02', label: 'TRANSACTIONS', path: '/transactions' },
    { num: '03', label: 'RECOVERY', path: '/recoveries' },
    { num: '04', label: 'ANALYTICS', path: '/analytics' },
    { num: '05', label: 'AUDIT', path: '/audit-log' },
    { num: '06', label: 'SYSTEM', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#070B17] text-[#dee1f9] flex flex-col md:flex-row font-geist antialiased selection:bg-primary/20 selection:text-white">
      {/* ========================================================================= */}
      {/* Desktop Sidebar (Integrated Mission-Control Navigation) */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-[#070B17]/95 p-6 shrink-0 justify-between">
        <div className="space-y-8">
          {/* Brand Header matching Landing Page */}
          <div
            className="cursor-pointer group flex items-center justify-between"
            onClick={() => navigate('/dashboard')}
          >
            <div>
              <span className="font-bold text-xl tracking-tight text-white group-hover:text-primary transition-colors">
                RecoverAI
              </span>
              <span className="text-[9px] block font-mono text-primary/70 tracking-widest uppercase mt-0.5">
                RECOVERY OS v1.0
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(53,211,154,0.6)]" />
          </div>

          {/* Numbered Chapter Navigation */}
          <nav className="space-y-1.5 font-mono text-xs">
            {navItems.map((item) => {
              const isActive =
                item.path === '/dashboard'
                  ? location.pathname === '/' || location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2.5 rounded transition-all group ${
                    isActive
                      ? 'border border-primary/40 bg-primary/10 text-primary font-bold shadow-[0_0_15px_rgba(193,193,255,0.12)]'
                      : 'border border-transparent text-on-surface-variant/70 hover:text-white hover:bg-surface-container-high/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] ${isActive ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                      {item.num}
                    </span>
                    <span className="tracking-wider">{item.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-3 bg-primary rounded-sm shadow-[0_0_8px_#c1c1ff]" />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: System Status & Session */}
        <div className="pt-6 border-t border-white/10 space-y-4 font-mono text-xs">
          {/* Status Capsule */}
          <div className="p-3 rounded bg-surface/50 border border-white/5 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-on-surface-variant/60">GATEWAY</span>
              <span className="text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded text-[9px]">
                TEST MODE
              </span>
            </div>
            <StatusIndicator status="OPERATIONAL" label="RAZORPAY CONNECTED" />
          </div>

          <div className="flex items-center gap-2">
            <NavLink
              to="/"
              className="flex-1 py-2 px-3 rounded bg-surface/50 hover:bg-surface/80 border border-white/10 hover:border-primary/30 text-on-surface-variant/80 hover:text-white text-[11px] text-center transition-all"
            >
              PUBLIC SITE &rarr;
            </NavLink>
            <button
              onClick={() => {
                clearSession();
                navigate('/');
              }}
              title="Sign Out"
              className="p-2 rounded bg-surface/50 hover:bg-surface/80 hover:text-error border border-white/10 text-on-surface-variant/60 transition-colors text-[11px]"
            >
              EXIT
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* Mobile Drawer Navigation */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-[#070B17]/90 backdrop-blur-xl flex">
          <div className="w-4/5 max-w-xs bg-[#070B17] border-r border-white/10 h-full p-6 flex flex-col justify-between shadow-2xl font-mono">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-lg text-white">RecoverAI</span>
                  <span className="text-[9px] block text-primary/70 tracking-widest">RECOVERY OS</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded text-on-surface-variant hover:text-white border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1 text-xs">
                {navItems.map((item) => {
                  const isActive =
                    item.path === '/dashboard'
                      ? location.pathname === '/' || location.pathname === '/dashboard'
                      : location.pathname.startsWith(item.path);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between px-3 py-2.5 rounded transition-colors ${
                        isActive
                          ? 'border border-primary/40 bg-primary/10 text-primary font-bold'
                          : 'text-on-surface-variant hover:text-white'
                      }`}
                    >
                      <span>{item.num} / {item.label}</span>
                      {isActive && <span>&rarr;</span>}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="text-xs text-on-surface-variant pt-4 border-t border-white/10">
              <StatusIndicator status="OPERATIONAL" label="SANDBOX TEST MODE" />
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* Main Content Area */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Mission-Control Bar */}
        <header className="h-16 border-b border-white/10 bg-[#070B17]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between shrink-0 font-mono text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded text-on-surface hover:bg-surface/50 border border-white/10"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-on-surface-variant/50">SYSTEM STATUS:</span>
              <StatusIndicator status="OPERATIONAL" label="ONLINE" />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Merchant Workspace Switcher */}
            <div className="relative">
              <button
                onClick={() => setMerchantDropdownOpen(!merchantDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface/50 hover:bg-surface/80 border border-white/10 hover:border-primary/40 text-on-surface text-xs font-mono transition-all"
              >
                <span className="text-on-surface-variant/50 text-[10px] hidden lg:inline">WORKSPACE:</span>
                <span className="truncate max-w-[150px] font-bold text-white">
                  {activeMerchant ? activeMerchant.name : 'Loading...'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant/60" />
              </button>

              {merchantDropdownOpen && merchants.length > 0 && (
                <div className="absolute right-0 mt-2 w-64 bg-[#070B17] border border-white/10 rounded-lg shadow-2xl z-50 p-2 space-y-1 backdrop-blur-2xl font-mono text-xs">
                  <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-on-surface-variant/50">
                    Switch Workspace
                  </div>
                  {merchants.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMerchant(m)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between text-xs ${
                        activeMerchant?.id === m.id
                          ? 'bg-primary/10 text-primary font-bold border border-primary/20'
                          : 'text-on-surface-variant/80 hover:bg-surface/50 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{m.name}</span>
                      {activeMerchant?.id === m.id && <span className="text-[9px] text-secondary">ACTIVE</span>}
                    </button>
                  ))}
                  <div className="border-t border-white/10 my-1"></div>
                  <button
                    onClick={() => {
                      clearSession();
                      navigate('/');
                    }}
                    className="w-full text-left px-3 py-2 rounded text-error hover:bg-error/10 text-xs transition-colors"
                  >
                    Exit Workspace
                  </button>
                </div>
              )}
            </div>

            {/* Test Mode Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold tracking-wider">
              <span>SANDBOX</span>
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
