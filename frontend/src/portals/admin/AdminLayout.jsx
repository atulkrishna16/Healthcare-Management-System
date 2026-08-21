import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, LayoutDashboard, Users, Bell, LogOut, Lock, Menu, X } from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/doctors', label: 'Physicians & Rostering', icon: Users, end: false },
    { to: '/admin/notifications', label: 'Notification Dispatch', icon: Bell, end: false },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8F0] text-[#355872] flex flex-col md:flex-row">
      {/* ── Mobile Top App Bar (< md) ────────────────────────────────────────── */}
      <header className="md:hidden bg-[#355872] px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#233B4D] border border-[#7AAACE]/40 flex items-center justify-center text-white">
            <ShieldCheck size={16} className="text-[#9CD5FF]" />
          </div>
          <div>
            <div className="text-base font-black font-display text-white leading-none">HMS</div>
            <div className="text-[9px] font-bold text-[#9CD5FF] tracking-wider uppercase">Executive Admin</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-[#233B4D] border border-[#7AAACE]/40 text-[#9CD5FF] hover:text-white transition active:scale-95"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* ── Mobile Dropdown Drawer (< md) ────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#355872] border-b border-[#7AAACE]/30 px-4 pt-2 pb-5 space-y-3 sticky top-[57px] z-40 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.end ? location.pathname === link.to : location.pathname.startsWith(link.to);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[#233B4D] text-[#9CD5FF] border border-[#7AAACE]/40'
                      : 'text-[#B4D3E8] hover:text-white hover:bg-[#233B4D]/50'
                  }`}
                >
                  <Icon size={17} />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[#7AAACE]/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#233B4D] text-[#9CD5FF] flex items-center justify-center text-xs font-bold shrink-0">
                <Lock size={13} />
              </div>
              <div className="truncate text-xs font-bold text-white">{user?.name || 'Administrator'}</div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#B4D3E8] hover:text-[#B5533C] hover:bg-[#B5533C]/10 transition shrink-0"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar (>= md) ────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 bg-[#355872] p-5 flex-col justify-between shrink-0 shadow-[4px_0_20px_rgba(53,88,114,0.1)] min-h-screen sticky top-0 h-screen">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#233B4D] border border-[#7AAACE]/40 flex items-center justify-center text-white">
              <ShieldCheck size={20} className="text-[#9CD5FF]" />
            </div>
            <div>
              <div className="text-xl font-black font-display tracking-tight text-white leading-none">
                HMS
              </div>
              <div className="text-[11px] font-bold tracking-wider text-[#9CD5FF] uppercase mt-0.5">
                Executive Admin
              </div>
            </div>
          </div>

          <div className="text-[11px] font-bold tracking-wider text-[#B4D3E8] uppercase px-3 mb-2">
            Operations
          </div>

          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#233B4D] text-[#9CD5FF] border border-[#7AAACE]/40'
                        : 'text-[#B4D3E8] hover:text-white hover:bg-[#233B4D]/50'
                    }`
                  }
                >
                  <Icon size={17} />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Admin Footer Profile */}
        <div className="pt-5 border-t border-[#7AAACE]/30 mt-6">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#233B4D] border border-[#7AAACE]/30 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#355872] text-[#9CD5FF] border border-[#7AAACE]/40 flex items-center justify-center font-bold text-xs">
              <Lock size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-[#9CD5FF] font-semibold">System Operator</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#B4D3E8] hover:text-[#B5533C] hover:bg-[#B5533C]/10 transition active:scale-[0.98]"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Admin Content ──────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 bg-[#F7F8F0] p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
