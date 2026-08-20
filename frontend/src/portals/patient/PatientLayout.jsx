import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { HeartPulse, Search, Calendar as CalendarIcon, LayoutDashboard, LogOut, User, Sparkles, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import { Calendar } from '@/components/ui/calendar';

export default function PatientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F7F8F0] text-[#355872] flex flex-col md:flex-row">
      {/* Patient Sidebar — Solid Ink (#355872) Background */}
      <aside className="w-full md:w-64 bg-[#355872] p-5 flex flex-col justify-between shrink-0 shadow-[4px_0_20px_rgba(53,88,114,0.1)]">
        <div>
          {/* Logo & Title */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#233B4D] border border-[#7AAACE]/40 flex items-center justify-center text-white">
              <HeartPulse size={20} className="text-[#9CD5FF]" />
            </div>
            <div>
              <div className="text-xl font-black font-display tracking-tight text-white leading-none">
                HMS
              </div>
              <div className="text-[11px] font-bold tracking-wider text-[#9CD5FF] uppercase mt-0.5">
                Patient Wellness
              </div>
            </div>
          </div>

          <div className="text-[11px] font-bold tracking-wider text-[#B4D3E8] uppercase px-3 mb-2">
            Care Portal
          </div>

          <nav className="space-y-1">
            <NavLink
              to="/patient"
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
              <span>Wellness Home</span>
            </NavLink>

            <NavLink
              to="/patient/search"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#233B4D] text-[#9CD5FF] border border-[#7AAACE]/40'
                    : 'text-[#B4D3E8] hover:text-white hover:bg-[#233B4D]/50'
                }`
              }
            >
              <Search size={17} />
              <span>Find Physicians</span>
            </NavLink>

            <NavLink
              to="/patient/appointments"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#233B4D] text-[#9CD5FF] border border-[#7AAACE]/40'
                    : 'text-[#B4D3E8] hover:text-white hover:bg-[#233B4D]/50'
                }`
              }
            >
              <CalendarIcon size={17} />
              <span>My Visits & Care Plans</span>
            </NavLink>
          </nav>
        </div>

        {/* Patient Profile Card */}
        <div className="pt-5 border-t border-[#7AAACE]/30 mt-6">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#233B4D] border border-[#7AAACE]/30 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#355872] text-[#9CD5FF] border border-[#7AAACE]/40 flex items-center justify-center font-bold text-xs">
              <User size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || 'Patient'}
              </div>
              <div className="text-[10px] text-[#9CD5FF] font-semibold">Verified Patient</div>
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

      {/* Center Main Content & Right-Side Persistent Calendar */}
      <div className="flex-1 min-w-0 flex flex-col xl:flex-row bg-[#F7F8F0]">
        {/* Main View Area */}
        <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>

        {/* Right Side Calendar Section — Visible on all Patient Pages */}
        <aside className="w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-[#7AAACE]/40 bg-[#F7F8F0] p-6 shrink-0 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon size={14} className="text-[#355872]" />
                Schedule Calendar
              </span>

              {/* Direct Jump to Custom Date & Year */}
              <input
                type="date"
                value={dayjs(selectedDate).format('YYYY-MM-DD')}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    setSelectedDate(new Date(year, month - 1, day));
                  }
                }}
                className="text-[11px] font-bold text-[#355872] bg-white border border-[#7AAACE] rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
              />
            </div>

            <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-2.5 flex justify-center shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                month={selectedDate}
                onMonthChange={setSelectedDate}
                captionLayout="dropdown"
                startMonth={new Date(2020, 0)}
                endMonth={new Date(2035, 11)}
                className="scale-95 origin-top bg-transparent border-0"
              />
            </div>
          </div>

          {/* AI Intake Notice */}
          <div className="p-4 rounded-2xl bg-white border border-[#7AAACE]/60 text-xs text-[#4A6478] space-y-2 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.06)]">
            <div className="flex items-center gap-2 text-[#355872] font-bold">
              <Sparkles size={14} className="text-[#7AAACE]" />
              Intelligent Intake System
            </div>
            <p className="leading-relaxed">
              When booking an appointment, our clinical AI extracts chief complaints and pre-formats intake notes for your physician.
            </p>
          </div>

          {/* Quick Schedule Helper */}
          <div className="p-4 rounded-2xl bg-white border border-[#7AAACE]/60 text-xs text-[#4A6478] space-y-1.5 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.06)]">
            <div className="flex items-center gap-2 text-[#355872] font-bold">
              <Clock size={14} className="text-[#7AAACE]" />
              Office Operating Hours
            </div>
            <p className="text-[#4A6478]">
              Mon – Fri: 08:00 AM – 06:00 PM EST
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
