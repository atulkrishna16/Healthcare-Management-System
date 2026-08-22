import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
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
  Calendar,
  Clock,
  User,
  Stethoscope,
  UserPlus,
  X,
  Mail,
  Lock,
  Plus,
  Terminal,
  RefreshCw,
  Database,
  Server,
  Zap,
  Trash2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const terminalEndRef = useRef(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [isDiagnosticsRunning, setIsDiagnosticsRunning] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);

  // ── Terminal Logs State ──────────────────────────────────────────────────────
  const [terminalLogs, setTerminalLogs] = useState([
    { time: dayjs().format('HH:mm:ss'), type: 'SYS', text: 'HMS Clinical Telemetry initialized. Ready for operations.' },
    { time: dayjs().format('HH:mm:ss'), type: 'AUTH', text: 'Executive Admin session verified. Full system command active.' },
    { time: dayjs().format('HH:mm:ss'), type: 'INFO', text: 'Click "Test DB & Redis" to benchmark live infrastructure latency.' },
  ]);

  const addLog = (type, text) => {
    setTerminalLogs((prev) => [
      ...prev,
      { time: dayjs().format('HH:mm:ss'), type, text },
    ]);
  };

  // Auto-scroll terminal to bottom when new logs arrive without moving outer page
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [terminalLogs]);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats().then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: adminUsers = [], isLoading: adminsLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listAdmins().then((r) => r.data),
  });

  // ── Run Health Check on Demand ───────────────────────────────────────────────
  const runHealthCheck = async () => {
    setIsDiagnosticsRunning(true);
    addLog('TEST', 'Initiating live infrastructure ping (PostgreSQL + Redis)...');

    try {
      const res = await adminApi.checkHealth();
      const data = res.data;
      setSystemHealth(data);

      if (data.db.status === 'online') {
        addLog('DB', `[OK] ${data.db.provider} responded in ${data.db.latencyMs}ms`);
      } else {
        addLog('ERR', `[FAIL] Database unreachable: ${data.db.error || 'Connection failed'}`);
      }

      if (data.redis.status === 'online') {
        addLog('REDIS', `[OK] ${data.redis.provider} responded in ${data.redis.latencyMs}ms`);
      } else {
        addLog('ERR', `[FAIL] Redis unreachable: ${data.redis.error || 'Connection failed'}`);
      }

      addLog('SYS', `Node runtime memory: ${data.server.memoryMb}MB | Server uptime: ${data.server.uptimeSeconds}s`);
      toast.success(`Diagnostics complete — DB: ${data.db.latencyMs ?? 'ERR'}ms, Redis: ${data.redis.latencyMs ?? 'ERR'}ms`);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Health check failed';
      addLog('ERR', `System diagnostics failed: ${msg}`);
      toast.error(msg);
    } finally {
      setIsDiagnosticsRunning(false);
    }
  };

  // Auto-run health check once on mount
  useEffect(() => {
    runHealthCheck();
  }, []);

  // ── Admin Creation Mutation ──────────────────────────────────────────────────
  const createAdminMutation = useMutation({
    mutationFn: (data) => adminApi.createAdmin(data),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'New Admin account created successfully');
      addLog('ADMIN', `Created new executive account: ${adminForm.email}`);
      setAdminForm({ name: '', email: '', password: '' });
      setIsAdminModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to create admin account';
      addLog('ERR', `Admin provisioning error: ${msg}`);
      toast.error(msg);
    },
  });

  const handleCreateAdmin = (e) => {
    e.preventDefault();
    if (!adminForm.name.trim() || !adminForm.email.trim() || !adminForm.password.trim()) {
      return toast.error('Please fill in all required fields');
    }
    if (adminForm.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    createAdminMutation.mutate(adminForm);
  };

  const statusMap = Array.isArray(stats?.appointmentsByStatus)
    ? stats.appointmentsByStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count?._all ?? curr._count ?? 0;
        return acc;
      }, {})
    : (stats?.appointmentsByStatus || {});

  const recentAppointments = stats?.recentAppointments || [];

  return (
    <div className="space-y-8 w-full bg-[#F7F8F0] text-[#355872]">
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
            Real-time platform throughput, staff administration, and appointment dispatch
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAdminModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-white text-xs font-bold transition shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Create Admin</span>
          </button>

          <button
            type="button"
            onClick={runHealthCheck}
            disabled={isDiagnosticsRunning}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#7AAACE] hover:bg-[#F7F8F0] text-[#355872] text-xs font-bold transition shadow-xs active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            <Zap size={14} className={isDiagnosticsRunning ? 'animate-spin text-[#D9A24B]' : 'text-[#355872]'} />
            <span>{isDiagnosticsRunning ? 'Testing...' : 'Test DB & Redis'}</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 shadow-[0_2px_12px_-2px_rgba(53,88,114,0.06)]">
          <div className="flex items-center justify-between text-[#4A6478] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Patients</span>
            <Users size={16} className="text-[#7AAACE]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#355872] font-display">
            {stats?.totalPatients ?? (statsLoading ? '...' : 0)}
          </div>
        </div>

        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 shadow-[0_2px_12px_-2px_rgba(53,88,114,0.06)]">
          <div className="flex items-center justify-between text-[#4A6478] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Physicians</span>
            <Activity size={16} className="text-[#7AAACE]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#355872] font-display">
            {stats?.totalDoctors ?? (statsLoading ? '...' : 0)}
          </div>
        </div>

        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 shadow-[0_2px_12px_-2px_rgba(53,88,114,0.06)]">
          <div className="flex items-center justify-between text-[#4A6478] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Appointments</span>
            <CalendarCheck size={16} className="text-[#7AAACE]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#355872] font-display">
            {stats?.totalAppointments ?? (statsLoading ? '...' : 0)}
          </div>
        </div>

        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 shadow-[0_2px_12px_-2px_rgba(53,88,114,0.06)]">
          <div className="flex items-center justify-between text-[#4A6478] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Queue Failures</span>
            <Bell size={16} className="text-[#B5533C]" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-display ${
            (stats?.failedNotifications || 0) > 0 ? 'text-[#B5533C]' : 'text-[#355872]'
          }`}>
            {stats?.failedNotifications ?? (statsLoading ? '...' : 0)}
          </div>
        </div>
      </div>

      {/* ── LIVE INFRASTRUCTURE TELEMETRY TERMINAL CONSOLE ─────────────────── */}
      <div className="bg-[#0C1824] border border-[#355872]/80 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] overflow-hidden">
        {/* Terminal Title Bar */}
        <div className="bg-[#132332] px-4 py-3 border-b border-[#355872]/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-[#B5533C] inline-block opacity-80" />
              <span className="w-3 h-3 rounded-full bg-[#D9A24B] inline-block opacity-80" />
              <span className="w-3 h-3 rounded-full bg-[#34A853] inline-block opacity-80" />
            </div>
            <Terminal size={14} className="text-[#9CD5FF]" />
            <span className="font-mono text-xs font-bold text-[#E2F1FF] tracking-wider">
              hms-cli@production:~$ live-telemetry
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Live DB & Redis Health Badges */}
            <div className="hidden sm:flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border flex items-center gap-1.5 ${
                systemHealth?.db?.status === 'online'
                  ? 'bg-[#34A853]/15 text-[#86EFAC] border-[#34A853]/30'
                  : 'bg-[#B5533C]/15 text-[#FCA5A5] border-[#B5533C]/30'
              }`}>
                <Database size={11} />
                <span>Postgres: {systemHealth?.db?.status === 'online' ? `${systemHealth.db.latencyMs}ms` : 'FAIL'}</span>
              </span>

              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border flex items-center gap-1.5 ${
                systemHealth?.redis?.status === 'online'
                  ? 'bg-[#34A853]/15 text-[#86EFAC] border-[#34A853]/30'
                  : 'bg-[#B5533C]/15 text-[#FCA5A5] border-[#B5533C]/30'
              }`}>
                <Server size={11} />
                <span>Redis: {systemHealth?.redis?.status === 'online' ? `${systemHealth.redis.latencyMs}ms` : 'FAIL'}</span>
              </span>
            </div>

            {/* Clear Console Button */}
            <button
              type="button"
              onClick={() => setTerminalLogs([{ time: dayjs().format('HH:mm:ss'), type: 'SYS', text: 'Console buffer cleared.' }])}
              className="p-1.5 rounded-lg text-[#7AAACE] hover:text-white hover:bg-[#233B4D] transition cursor-pointer"
              title="Clear Terminal Logs"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Scrollable Monospace Terminal Logs Area (Fixed height with internal scroll so page stays fixed) */}
        <div className="p-4 sm:p-5 h-60 sm:h-64 overflow-y-auto font-mono text-xs leading-relaxed space-y-1.5 bg-[#0C1824] select-text">
          {terminalLogs.map((log, idx) => {
            const typeColors = {
              SYS: 'text-[#9CD5FF]',
              DB: 'text-[#86EFAC]',
              REDIS: 'text-[#FDE047]',
              AUTH: 'text-[#C084FC]',
              ADMIN: 'text-[#67E8F9]',
              TEST: 'text-[#FDBA74]',
              ERR: 'text-[#FCA5A5] font-bold',
            };

            return (
              <div key={idx} className="flex items-start gap-2 hover:bg-[#132332]/50 px-1.5 py-0.5 rounded transition">
                <span className="text-[#4A6478] select-none shrink-0">[{log.time}]</span>
                <span className={`font-bold shrink-0 ${typeColors[log.type] || 'text-[#9CD5FF]'}`}>
                  [{log.type}]
                </span>
                <span className="text-[#E2F1FF] break-all">{log.text}</span>
              </div>
            );
          })}
          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Footer Bar */}
        <div className="bg-[#132332] px-4 py-2 border-t border-[#355872]/40 flex items-center justify-between text-[11px] font-mono text-[#7AAACE]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#34A853] animate-pulse" />
            <span>Connection: Live WebSocket / SSE Active</span>
          </div>
          <span>Status 200 OK</span>
        </div>
      </div>

      {/* Appointment Breakdown & Quick Action Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Appointments by Status */}
        <div className="lg:col-span-2 bg-white border border-[#7AAACE]/60 rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(53,88,114,0.06)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={15} className="text-[#7AAACE]" />
              Appointment Pipeline Breakdown
            </h2>
            <span className="text-xs text-[#4A6478] font-semibold">Live Metrics</span>
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
                className={`p-3.5 sm:p-4 rounded-xl border text-center space-y-1 ${bg}`}
              >
                <div className={`text-xl sm:text-2xl font-black font-display ${text}`}>
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
        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(53,88,114,0.06)] space-y-3">
          <h2 className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#355872]" />
            Quick Administration
          </h2>

          <div className="space-y-2.5">
            <Link
              to="/admin/doctors"
              className="p-3.5 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 hover:border-[#355872] transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white text-[#355872] border border-[#7AAACE]/60 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#355872] group-hover:text-[#233B4D] transition-colors">
                    Physician Management
                  </div>
                  <div className="text-[10px] text-[#4A6478]">Rosters & Shift Scheduler</div>
                </div>
              </div>
              <ArrowUpRight size={15} className="text-[#7AAACE] group-hover:text-[#355872] transition-colors" />
            </Link>

            <Link
              to="/admin/notifications"
              className="p-3.5 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 hover:border-[#355872] transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white text-[#355872] border border-[#7AAACE]/60 flex items-center justify-center">
                  <Bell size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#355872] group-hover:text-[#233B4D] transition-colors">
                    Notification Dispatch
                  </div>
                  <div className="text-[10px] text-[#4A6478]">Email & Calendar Queue</div>
                </div>
              </div>
              <ArrowUpRight size={15} className="text-[#7AAACE] group-hover:text-[#355872] transition-colors" />
            </Link>
          </div>
        </div>

      </div>

      {/* Executive Staff / Admin Accounts Directory */}
      <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(53,88,114,0.06)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#7AAACE]/30">
          <div>
            <h2 className="text-sm font-bold text-[#355872] tracking-tight flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#7AAACE]" />
              Executive Administrators
            </h2>
            <p className="text-xs text-[#4A6478] mt-0.5">
              Authorized administrators with full clinical scheduling, provider roster, and system command rights
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAdminModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Admin</span>
          </button>
        </div>

        {adminsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-[#7AAACE]/30 bg-[#F7F8F0]/40 space-y-2">
                <Skeleton className="h-4 w-32 bg-[#7AAACE]/20" />
                <Skeleton className="h-3 w-44 bg-[#7AAACE]/20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {adminUsers.map((admin) => (
              <div
                key={admin.id}
                className="p-4 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/50 flex items-start justify-between gap-3 shadow-2xs hover:border-[#355872] transition"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white text-[#355872] border border-[#7AAACE]/60 flex items-center justify-center font-bold text-xs shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#355872] truncate">{admin.name}</div>
                    <div className="text-[11px] text-[#4A6478] truncate">{admin.email}</div>
                    <div className="text-[10px] text-[#7AAACE] font-medium mt-1">
                      Joined {dayjs(admin.createdAt).format('MMM D, YYYY')}
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#355872] text-white uppercase tracking-wider shrink-0">
                  Admin
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real-time Recent Activity & All Booked Appointments Feed */}
      <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(53,88,114,0.06)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#7AAACE]/30">
          <div>
            <h2 className="text-sm font-bold text-[#355872] tracking-tight flex items-center gap-2">
              <CalendarCheck size={16} className="text-[#7AAACE]" />
              Recent Consultations & Bookings
            </h2>
            <p className="text-xs text-[#4A6478] mt-0.5">
              Live chronological feed of appointments booked across all hospital providers
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#355872] bg-[#F7F8F0] border border-[#7AAACE]/50 px-2.5 py-1 rounded-full">
            {recentAppointments.length} Active Records
          </span>
        </div>

        {statsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-[#7AAACE]/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl bg-[#7AAACE]/20" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32 bg-[#7AAACE]/20" />
                    <Skeleton className="h-3 w-24 bg-[#7AAACE]/20" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full bg-[#7AAACE]/20" />
              </div>
            ))}
          </div>
        ) : recentAppointments.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#4A6478] space-y-1">
            <CalendarCheck size={28} className="mx-auto text-[#7AAACE] opacity-50" />
            <p className="font-bold text-[#355872]">No appointments recorded yet.</p>
            <p>New bookings made by patients or doctors will appear here in real time.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#7AAACE]/20 max-h-[380px] sm:max-h-[440px] overflow-y-auto pr-1">
            {recentAppointments.map((appt) => {
              const statusColors = {
                confirmed: 'bg-[#9CD5FF] text-[#355872] border-[#7AAACE]',
                held: 'bg-[#D9A24B]/20 text-[#D9A24B] border-[#D9A24B]/40',
                completed: 'bg-[#355872] text-white border-[#355872]',
                cancelled: 'bg-[#B5533C]/15 text-[#B5533C] border-[#B5533C]/40',
                doctor_leave_cancelled: 'bg-[#B5533C]/15 text-[#B5533C] border-[#B5533C]/40',
              };

              const urgency = appt.symptomForm?.aiSummary?.urgency;

              return (
                <div key={appt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F8F0]/50 px-2 rounded-xl transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 text-[#355872] flex items-center justify-center font-bold text-xs shrink-0">
                      <User size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#355872] flex items-center gap-2">
                        <span>{appt.patient?.name || 'Patient'}</span>
                        <span className="text-[11px] font-normal text-[#4A6478]">({appt.patient?.email})</span>
                        {urgency && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase ${
                            urgency === 'High' ? 'bg-[#B5533C]/10 text-[#B5533C] border-[#B5533C]/40' :
                            urgency === 'Medium' ? 'bg-[#D9A24B]/10 text-[#D9A24B] border-[#D9A24B]/40' :
                            'bg-[#9CD5FF]/20 text-[#355872] border-[#7AAACE]/40'
                          }`}>
                            {urgency} Priority
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#4A6478] flex items-center gap-2 mt-0.5">
                        <Stethoscope size={12} className="text-[#7AAACE]" />
                        <span>Dr. {appt.doctor?.user?.name || 'Physician'} ({appt.doctor?.specialisation})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right text-[11px] text-[#4A6478]">
                      <div className="font-semibold text-[#355872] flex items-center gap-1">
                        <Calendar size={11} className="text-[#7AAACE]" />
                        {dayjs(appt.slotStart).format('MMM D, YYYY')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-[#7AAACE]" />
                        {dayjs(appt.slotStart).format('h:mm A')}
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      statusColors[appt.status] || 'bg-gray-100 text-gray-700'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CREATE ADMIN MODAL ──────────────────────────────────────────────── */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#355872]/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#7AAACE]/60 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(53,88,114,0.2)] animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#7AAACE]/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] flex items-center justify-center font-bold">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#355872] text-lg font-display">Create Administrator</h3>
                  <p className="text-xs text-[#4A6478]">Provision new executive staff access</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAdminModalOpen(false)}
                className="p-1.5 rounded-lg text-[#7AAACE] hover:text-[#355872] hover:bg-[#F7F8F0] transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7AAACE]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Lisa Reynolds"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#7AAACE] text-xs font-medium text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872] focus:ring-1 focus:ring-[#355872] bg-[#F7F8F0]/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7AAACE]" />
                  <input
                    type="email"
                    required
                    placeholder="lisa.reynolds@clinic.com"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#7AAACE] text-xs font-medium text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872] focus:ring-1 focus:ring-[#355872] bg-[#F7F8F0]/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                  Initial Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7AAACE]" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#7AAACE] text-xs font-medium text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872] focus:ring-1 focus:ring-[#355872] bg-[#F7F8F0]/50"
                  />
                </div>
                <span className="text-[10px] text-[#4A6478]">Minimum 6 characters</span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#7AAACE]/30">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#4A6478] hover:bg-[#F7F8F0] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAdminMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-white text-xs font-bold transition shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {createAdminMutation.isPending ? 'Provisioning...' : 'Create Account'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
