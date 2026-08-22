import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Stethoscope,
  LayoutDashboard,
  LogOut,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Clock,
} from 'lucide-react';

export default function DoctorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/doctor', label: 'Practice Dashboard', icon: LayoutDashboard, end: true },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8F0] text-[#355872] flex flex-col md:flex-row relative">
      {/* ── Mobile Top App Bar (< md) ────────────────────────────────────────── */}
      <header className="md:hidden bg-[#355872] px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#233B4D] border border-[#7AAACE]/40 flex items-center justify-center text-white">
            <Stethoscope size={16} className="text-[#9CD5FF]" />
          </div>
          <div>
            <div className="text-base font-black font-display text-white leading-none">HMS</div>
            <div className="text-[9px] font-bold text-[#9CD5FF] tracking-wider uppercase">Clinical Suite</div>
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
                <UserCheck size={14} />
              </div>
              <div className="truncate text-xs font-bold text-white">{user?.name || 'Physician'}</div>
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

      {/* ── Desktop Mini-Icon Rail (>= md) — Fixed 64px width ───────────────── */}
      <aside className="hidden md:flex w-16 bg-[#355872] py-5 px-2.5 flex-col justify-between items-center shrink-0 shadow-[4px_0_20px_rgba(53,88,114,0.1)] min-h-screen fixed top-0 left-0 h-screen z-30">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Logo / Trigger */}
          <button
            onClick={() => setIsSidebarExpanded(true)}
            className="w-10 h-10 rounded-xl bg-[#233B4D] border border-[#7AAACE]/40 flex items-center justify-center text-white hover:border-[#9CD5FF] hover:scale-105 transition cursor-pointer group"
            title="Expand Clinical Suite"
          >
            <Stethoscope size={20} className="text-[#9CD5FF] group-hover:rotate-12 transition-transform" />
          </button>

          {/* Expand Rail Button */}
          <button
            onClick={() => setIsSidebarExpanded(true)}
            className="p-2 rounded-xl text-[#9CD5FF] hover:text-white hover:bg-[#233B4D] transition cursor-pointer"
            title="Expand Full Menu"
          >
            <PanelLeftOpen size={18} />
          </button>

          {/* Nav Icons */}
          <nav className="flex flex-col items-center gap-2 w-full">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.end ? location.pathname === link.to : location.pathname.startsWith(link.to);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  title={link.label}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-[#233B4D] text-[#9CD5FF] border border-[#7AAACE]/60 shadow-sm'
                      : 'text-[#B4D3E8] hover:text-white hover:bg-[#233B4D]/60'
                  }`}
                >
                  <Icon size={19} />
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom User & Logout Icons */}
        <div className="flex flex-col items-center gap-3 w-full pt-4 border-t border-[#7AAACE]/20">
          <button
            onClick={() => setIsSidebarExpanded(true)}
            title={`Dr. ${user?.name || 'Physician'}`}
            className="w-10 h-10 rounded-xl bg-[#233B4D] text-[#9CD5FF] border border-[#7AAACE]/40 flex items-center justify-center hover:border-[#9CD5FF] transition cursor-pointer"
          >
            <UserCheck size={18} />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="w-10 h-10 rounded-xl text-[#B4D3E8] hover:text-[#B5533C] hover:bg-[#B5533C]/10 flex items-center justify-center transition cursor-pointer"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ── Overlay Flyout Sidebar (When Expanded Over Content) ────────────────── */}
      {isSidebarExpanded && (
        <div className="fixed inset-0 z-50 flex">
          {/* Glassmorphism Backdrop */}
          <div
            className="fixed inset-0 bg-[#355872]/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setIsSidebarExpanded(false)}
          />

          {/* Full Flyout Drawer */}
          <aside className="relative w-72 bg-[#355872] p-5 flex flex-col justify-between shrink-0 shadow-[8px_0_30px_rgba(0,0,0,0.25)] min-h-screen h-screen z-50 animate-in slide-in-from-left duration-200">
            <div>
              {/* Header with Close Button */}
              <div className="flex items-center justify-between px-2 py-2 mb-6 border-b border-[#7AAACE]/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#233B4D] border border-[#7AAACE]/40 flex items-center justify-center text-white">
                    <Stethoscope size={20} className="text-[#9CD5FF]" />
                  </div>
                  <div>
                    <div className="text-xl font-black font-display tracking-tight text-white leading-none">
                      HMS
                    </div>
                    <div className="text-[10px] font-bold tracking-wider text-[#9CD5FF] uppercase mt-0.5">
                      Clinical Suite
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsSidebarExpanded(false)}
                  className="p-2 rounded-xl text-[#9CD5FF] hover:text-white hover:bg-[#233B4D] transition cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose size={18} />
                </button>
              </div>

              <div className="text-[11px] font-bold tracking-wider text-[#B4D3E8] uppercase px-3 mb-2">
                Physician Station
              </div>

              <nav className="space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      onClick={() => setIsSidebarExpanded(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-[#233B4D] text-[#9CD5FF] border border-[#7AAACE]/40 shadow-sm'
                            : 'text-[#B4D3E8] hover:text-white hover:bg-[#233B4D]/50'
                        }`
                      }
                    >
                      <Icon size={18} />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              {/* Status Badge */}
              <div className="mt-8 p-3 rounded-2xl bg-[#233B4D]/60 border border-[#7AAACE]/30 space-y-1 text-xs">
                <div className="text-[10px] font-bold text-[#9CD5FF] uppercase tracking-wider">Clinical Status</div>
                <div className="text-white font-bold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>On Duty & Accepting Patients</span>
                </div>
              </div>
            </div>

            {/* Bottom User Card & Full Logout */}
            <div className="pt-4 border-t border-[#7AAACE]/20 space-y-3">
              <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-[#233B4D]/60 border border-[#7AAACE]/30">
                <div className="w-9 h-9 rounded-lg bg-[#355872] text-[#9CD5FF] flex items-center justify-center font-bold text-xs shrink-0">
                  <UserCheck size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">Dr. {user?.name || 'Physician'}</div>
                  <div className="text-[10px] text-[#B4D3E8] truncate">{user?.email}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-[#B5533C]/80 hover:bg-[#B5533C] transition shadow-sm cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content Viewport (Expanded full breadth for dashboards & queues) ── */}
      <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 md:ml-16 overflow-y-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
