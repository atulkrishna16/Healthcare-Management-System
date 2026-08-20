import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import {
  ShieldCheck,
  Users,
  Bell,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats().then((r) => r.data),
  });

  const statusMap = stats?.appointmentsByStatus || {};

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto bg-[#F7F8F0] text-[#355872]">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#7AAACE]/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#355872] uppercase tracking-wider mb-1">
            <ShieldCheck size={14} className="text-[#355872]" />
            Operations Command
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#355872] tracking-tight font-display">
            System Executive Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#4A6478] mt-0.5">
            Real-time platform throughput, physician utilization, and notification dispatch health
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#9CD5FF]/30 text-[#355872] border border-[#7AAACE]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#355872]" />
            Workers Operational
          </span>
        </div>
      </div>

      {/* Main KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <div className="flex items-center justify-between text-[#4A6478] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Patients</span>
            <Users size={16} className="text-[#7AAACE]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#355872] font-display">
            {stats?.totalPatients ?? (isLoading ? '...' : 0)}
          </div>
        </div>

        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <div className="flex items-center justify-between text-[#4A6478] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Physicians</span>
            <Activity size={16} className="text-[#7AAACE]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#355872] font-display">
            {stats?.totalDoctors ?? (isLoading ? '...' : 0)}
          </div>
        </div>

        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <div className="flex items-center justify-between text-[#4A6478] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Appointments</span>
            <CalendarCheck size={16} className="text-[#7AAACE]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#355872] font-display">
            {stats?.totalAppointments ?? (isLoading ? '...' : 0)}
          </div>
        </div>

        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <div className="flex items-center justify-between text-[#4A6478] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Queue Failures</span>
            <Bell size={16} className="text-[#B5533C]" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-display ${
            (stats?.failedNotifications || 0) > 0 ? 'text-[#B5533C]' : 'text-[#355872]'
          }`}>
            {stats?.failedNotifications ?? (isLoading ? '...' : 0)}
          </div>
        </div>
      </div>

      {/* Appointment Breakdown & Quick Action Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Appointments by Status */}
        <div className="lg:col-span-2 bg-white border border-[#7AAACE]/60 rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={15} className="text-[#7AAACE]" />
              Appointment Pipeline Breakdown
            </h2>
            <span className="text-xs text-[#4A6478] font-semibold">Live DB Metrics</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Confirmed', key: 'confirmed', bg: 'bg-[#F7F8F0] border-[#7AAACE]', text: 'text-[#355872]' },
              { label: 'Active Holds', key: 'held', bg: 'bg-[#F7F8F0] border-[#D9A24B]/50', text: 'text-[#D9A24B]' },
              { label: 'Completed', key: 'completed', bg: 'bg-[#F7F8F0] border-[#7AAACE]', text: 'text-[#355872]' },
              { label: 'Cancelled', key: 'cancelled', bg: 'bg-[#F7F8F0] border-[#B5533C]/40', text: 'text-[#B5533C]' },
            ].map(({ label, key, bg, text }) => (
              <div
                key={key}
                className={`p-4 rounded-xl border text-center space-y-1 ${bg}`}
              >
                <div className={`text-2xl font-black font-display ${text}`}>
                  {statusMap[key] ?? 0}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#4A6478]">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Operations Links */}
        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] space-y-4">
          <h2 className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#355872]" />
            Quick Administration
          </h2>

          <div className="space-y-3">
            <Link
              to="/admin/doctors"
              className="p-4 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 hover:border-[#355872] transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white text-[#355872] border border-[#7AAACE]/60 flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#355872] group-hover:text-[#233B4D] transition-colors">
                    Physician Management
                  </div>
                  <div className="text-[11px] text-[#4A6478]">Rosters & Leave Scheduler</div>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-[#7AAACE] group-hover:text-[#355872] transition-colors" />
            </Link>

            <Link
              to="/admin/notifications"
              className="p-4 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 hover:border-[#355872] transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white text-[#355872] border border-[#7AAACE]/60 flex items-center justify-center">
                  <Bell size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#355872] group-hover:text-[#233B4D] transition-colors">
                    Notification Dispatch
                  </div>
                  <div className="text-[11px] text-[#4A6478]">Queue & Backoff Audit</div>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-[#7AAACE] group-hover:text-[#355872] transition-colors" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
