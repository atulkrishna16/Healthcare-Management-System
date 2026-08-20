import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Stethoscope, LayoutDashboard, LogOut, UserCheck } from 'lucide-react';

export default function DoctorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F7F8F0] text-[#355872] flex flex-col md:flex-row">
      {/* Clinical Sidebar — Solid Ink (#355872) Background */}
      <aside className="w-full md:w-64 bg-[#355872] p-5 flex flex-col justify-between shrink-0 shadow-[4px_0_20px_rgba(53,88,114,0.1)]">
        <div>
          {/* Logo & Title */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#233B4D] border border-[#7AAACE]/40 flex items-center justify-center text-white">
              <Stethoscope size={20} className="text-[#9CD5FF]" />
            </div>
            <div>
              <div className="text-xl font-black font-display tracking-tight text-white leading-none">
                HMS
              </div>
              <div className="text-[11px] font-bold tracking-wider text-[#9CD5FF] uppercase mt-0.5">
                Clinical Suite
              </div>
            </div>
          </div>

          <div className="text-[11px] font-bold tracking-wider text-[#B4D3E8] uppercase px-3 mb-2">
            Navigation
          </div>

          <nav className="space-y-1">
            <NavLink
              to="/doctor"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#233B4D] text-[#9CD5FF] border border-[#7AAACE]/40'
                    : 'text-[#B4D3E8] hover:text-white hover:bg-[#233B4D]/50'
                }`
              }
            >
              <LayoutDashboard size={17} />
              <span>Practice Dashboard</span>
            </NavLink>
          </nav>
        </div>

        {/* Doctor Footer Profile */}
        <div className="pt-5 border-t border-[#7AAACE]/30 mt-6">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#233B4D] border border-[#7AAACE]/30 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#355872] text-[#9CD5FF] border border-[#7AAACE]/40 flex items-center justify-center font-bold text-xs">
              <UserCheck size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || 'Physician'}
              </div>
              <div className="text-[10px] text-[#9CD5FF] font-semibold">Attending MD</div>
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

      {/* Main Clinical Content — Warm Paper Background (#F7F8F0) */}
      <main className="flex-1 min-w-0 bg-[#F7F8F0] overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
