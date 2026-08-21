import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  Users,
  Plus,
  Trash2,
  CalendarOff,
  Clock,
  X,
  AlertTriangle,
  Stethoscope,
  Mail,
  User,
  ShieldAlert,
  Search,
  CalendarDays,
  Sparkles,
  Sunrise,
  Sun,
  Moon,
  Building,
  Save,
  SlidersHorizontal,
  Wand2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import SimplePagination from '../../components/SimplePagination';

const DOCTOR_PAGE_SIZE = 6;

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 0, name: 'Sunday' },
];

const PRESETS = [
  {
    id: 'morning',
    name: 'Morning Shift',
    icon: Sunrise,
    startTime: '08:00',
    endTime: '12:00',
    description: '08:00 AM – 12:00 PM',
  },
  {
    id: 'afternoon',
    name: 'Forenoon / Afternoon',
    icon: Sun,
    startTime: '12:00',
    endTime: '16:00',
    description: '12:00 PM – 04:00 PM',
  },
  {
    id: 'evening',
    name: 'Evening / Night Shift',
    icon: Moon,
    startTime: '17:00',
    endTime: '21:00',
    description: '05:00 PM – 09:00 PM',
  },
  {
    id: 'fullday',
    name: 'Full Day Shift',
    icon: Building,
    startTime: '09:00',
    endTime: '17:00',
    description: '09:00 AM – 05:00 PM',
  },
];

function generatePreviewSlots(startTime, endTime, durationMinutes) {
  if (!startTime || !endTime || !durationMinutes || durationMinutes <= 0) return [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let current = dayjs().hour(startH).minute(startM).second(0);
  const end = dayjs().hour(endH).minute(endM).second(0);

  const slots = [];
  while (current.add(durationMinutes, 'minute').isBefore(end) || current.add(durationMinutes, 'minute').isSame(end)) {
    const slotStartFormatted = current.format('h:mm A');
    const nextTime = current.add(durationMinutes, 'minute');
    const slotEndFormatted = nextTime.format('h:mm A');
    slots.push(`${slotStartFormatted} – ${slotEndFormatted}`);
    current = nextTime;
  }
  return slots;
}

export default function AdminDoctors() {
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [adminDoctorPage, setAdminDoctorPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scheduleDoctor, setScheduleDoctor] = useState(null);
  const [scheduleMode, setScheduleMode] = useState('preset');
  const [scheduleSlotDuration, setScheduleSlotDuration] = useState(30);
  const [scheduleWorkingDays, setScheduleWorkingDays] = useState([]);
  const [scheduleSelectedDayId, setScheduleSelectedDayId] = useState(1);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const [leaveDoctor, setLeaveDoctor] = useState(null);
  const [leaveDate, setLeaveDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [leaveReason, setLeaveReason] = useState('');

  const [newDoctor, setNewDoctor] = useState({
    name: '',
    email: '',
    specialisation: 'General Practice',
    slotDuration: 30,
    timezone: 'America/New_York',
    bio: '',
    workingHours: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
    ],
  });

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: () => adminApi.getDoctors().then((r) => r.data),
  });

  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctors;
    const q = searchQuery.toLowerCase();
    return doctors.filter(
      (d) =>
        d.user?.name?.toLowerCase().includes(q) ||
        d.user?.email?.toLowerCase().includes(q) ||
        d.specialisation?.toLowerCase().includes(q)
    );
  }, [doctors, searchQuery]);

  const totalDoctorPages = Math.max(1, Math.ceil(filteredDoctors.length / DOCTOR_PAGE_SIZE));
  const paginatedDoctors = useMemo(() => {
    const start = (adminDoctorPage - 1) * DOCTOR_PAGE_SIZE;
    return filteredDoctors.slice(start, start + DOCTOR_PAGE_SIZE);
  }, [filteredDoctors, adminDoctorPage]);

  const openScheduleModal = (doc) => {
    setScheduleDoctor(doc);
    setScheduleSlotDuration(doc.slotDuration || 30);
    const whMap = new Map((doc.workingHours || []).map((h) => [h.dayOfWeek, h]));
    setScheduleWorkingDays(
      DAYS.map((d) => ({
        dayOfWeek: d.id,
        name: d.name,
        active: whMap.has(d.id),
        startTime: whMap.get(d.id)?.startTime || '09:00',
        endTime: whMap.get(d.id)?.endTime || '17:00',
      }))
    );
    setScheduleSelectedDayId(1);
  };

  const handleSaveDoctorSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleDoctor) return;
    setIsSavingSchedule(true);

    const activeWorkingHours = scheduleWorkingDays
      .filter((d) => d.active)
      .map((d) => ({
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
      }));

    try {
      await adminApi.updateDoctorSchedule(scheduleDoctor.id, {
        slotDuration: Number(scheduleSlotDuration),
        workingHours: activeWorkingHours,
      });

      toast.success(`Slots & shift schedule updated for Dr. ${scheduleDoctor.user?.name}`);
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
      setScheduleDoctor(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update schedule');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload) => adminApi.createDoctor(payload),
    onSuccess: () => {
      toast.success('Physician onboarded successfully! Temporary credentials emailed.');
      setShowCreateModal(false);
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
      setNewDoctor({
        name: '',
        email: '',
        specialisation: 'General Practice',
        slotDuration: 30,
        timezone: 'America/New_York',
        bio: '',
        workingHours: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
        ],
      });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to register physician'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteDoctor(id),
    onSuccess: () => {
      toast.success('Physician profile removed');
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete doctor'),
  });

  const leaveMutation = useMutation({
    mutationFn: ({ doctorId, payload }) => adminApi.addLeave(doctorId, payload),
    onSuccess: () => {
      toast.success('Leave scheduled. Affected patients notified via email queue.');
      setLeaveDoctor(null);
      setLeaveReason('');
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Leave scheduling failed'),
  });

  const selectedDayConfig = scheduleWorkingDays.find((d) => d.dayOfWeek === scheduleSelectedDayId) || scheduleWorkingDays[0];
  const schedulePreviewSlots = useMemo(() => {
    if (!selectedDayConfig || !selectedDayConfig.active) return [];
    return generatePreviewSlots(selectedDayConfig.startTime, selectedDayConfig.endTime, Number(scheduleSlotDuration));
  }, [selectedDayConfig, scheduleSlotDuration]);

  return (
    <div className="space-y-8 w-full bg-[#F7F8F0] text-[#355872]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#7AAACE]/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#355872] uppercase tracking-wider mb-1">
            <Users size={14} className="text-[#355872]" />
            Medical Staff Rostering & Slot Builder
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#355872] tracking-tight font-display">
            Physicians & Staff
          </h1>
          <p className="text-xs sm:text-sm text-[#4A6478] mt-0.5">
            Search physicians, create custom slots, configure shift templates, and manage leaves
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-xs font-bold text-white transition flex items-center gap-2 shadow-[0_4px_12px_rgba(53,88,114,0.15)] active:scale-[0.98] shrink-0"
        >
          <Plus size={16} />
          Register Physician
        </button>
      </div>

      {/* Doctor Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7AAACE]" />
        <input
          type="text"
          placeholder="Search by physician name, email, or specialty..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-[#7AAACE] text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872] focus:ring-2 focus:ring-[#9CD5FF] text-sm shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] font-medium"
        />
      </div>

      {/* Doctors Table */}
      <div className="bg-white border border-[#7AAACE]/60 rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#7AAACE]/40 bg-[#F7F8F0] hover:bg-[#F7F8F0]">
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider pl-6">Physician</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider">Specialisation</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider">Slot Time</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider">Active Bookings</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider text-right pr-6">Slot & Roster Controls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i} className="border-b border-[#7AAACE]/20">
                  <TableCell className="pl-6 py-4">
                    <Skeleton className="h-4 w-36 mb-1 bg-[#7AAACE]/20" />
                    <Skeleton className="h-3 w-48 bg-[#7AAACE]/20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28 bg-[#7AAACE]/20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16 bg-[#7AAACE]/20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12 bg-[#7AAACE]/20" />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-7 w-24 rounded-lg bg-[#7AAACE]/20" />
                      <Skeleton className="h-7 w-16 rounded-lg bg-[#7AAACE]/20" />
                      <Skeleton className="h-7 w-8 rounded-lg bg-[#7AAACE]/20" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : filteredDoctors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[#4A6478]">
                  {searchQuery ? 'No physicians matched your search.' : 'No physician profiles found.'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedDoctors.map((doc) => (
                <TableRow key={doc.id} className="border-b border-[#7AAACE]/20 hover:bg-[#F7F8F0]/70 transition">
                  <TableCell className="pl-6 py-4">
                    <div className="font-bold text-[#355872] text-sm">{doc.user?.name}</div>
                    <div className="text-xs text-[#4A6478]">{doc.user?.email}</div>
                  </TableCell>

                  <TableCell className="text-xs font-bold text-[#355872]">
                    {doc.specialisation}
                  </TableCell>

                  <TableCell className="text-xs text-[#4A6478]">
                    {doc.slotDuration} mins
                  </TableCell>

                  <TableCell className="text-xs font-bold text-[#355872]">
                    {doc._count?.appointments ?? 0}
                  </TableCell>

                  <TableCell className="pr-6 text-right space-x-2">
                    <button
                      onClick={() => openScheduleModal(doc)}
                      className="px-3 py-1.5 rounded-lg bg-[#355872] hover:bg-[#233B4D] text-white text-xs font-bold transition active:scale-[0.97] inline-flex items-center gap-1.5 shadow-2xs"
                      title="Manage Shifts & Slots"
                    >
                      <Clock size={13} />
                      <span>Manage Slots</span>
                    </button>

                    <button
                      onClick={() => setLeaveDoctor(doc)}
                      className="px-3 py-1.5 rounded-lg bg-[#F7F8F0] hover:bg-[#EEF0E5] text-[#D9A24B] border border-[#D9A24B]/50 text-xs font-bold transition active:scale-[0.97] inline-flex items-center gap-1.5"
                    >
                      <CalendarOff size={13} />
                      <span>Leave</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Remove Dr. ${doc.user?.name} from clinical directory?`)) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#F7F8F0] hover:bg-[#B5533C]/10 text-[#B5533C] border border-[#B5533C]/30 text-xs transition active:scale-[0.97] inline-flex items-center"
                      title="Delete Physician"
                    >
                      <Trash2 size={13} />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <SimplePagination page={adminDoctorPage} total={totalDoctorPages} onChange={setAdminDoctorPage} />
      </div>

      {/* ── ADMIN DOCTOR SCHEDULE BUILDER MODAL ─────────────────────────────── */}
      {scheduleDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#355872]/40 backdrop-blur-xs">
          <div className="bg-white border border-[#7AAACE]/60 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(53,88,114,0.2)] max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#7AAACE]/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] flex items-center justify-center font-bold">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#355872] tracking-tight">
                    Manage Slots for Dr. {scheduleDoctor.user?.name}
                  </h2>
                  <p className="text-xs text-[#4A6478]">
                    {scheduleDoctor.user?.email} · {scheduleDoctor.specialisation}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScheduleDoctor(null)}
                className="p-2 text-[#7AAACE] hover:text-[#355872] hover:bg-[#F7F8F0] rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F7F8F0] border border-[#7AAACE]/50 rounded-2xl">
              <button
                type="button"
                onClick={() => setScheduleMode('preset')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  scheduleMode === 'preset'
                    ? 'bg-[#355872] text-white shadow-sm'
                    : 'text-[#355872] hover:text-[#233B4D]'
                }`}
              >
                <Wand2 size={14} />
                1. Preset Shifts (Auto Slices)
              </button>

              <button
                type="button"
                onClick={() => setScheduleMode('manual')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  scheduleMode === 'manual'
                    ? 'bg-[#355872] text-white shadow-sm'
                    : 'text-[#355872] hover:text-[#233B4D]'
                }`}
              >
                <SlidersHorizontal size={14} />
                2. Custom Shift Times
              </button>
            </div>

            <form onSubmit={handleSaveDoctorSchedule} className="space-y-6">
              {/* Duration selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                  Slot Duration (Minutes Per Visit)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[15, 20, 30, 45, 60].map((mins) => (
                    <button
                      type="button"
                      key={mins}
                      onClick={() => setScheduleSlotDuration(mins)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        Number(scheduleSlotDuration) === mins
                          ? 'bg-[#355872] text-white border-[#355872] shadow-sm'
                          : 'bg-[#F7F8F0] text-[#355872] border-[#7AAACE]/60 hover:bg-white'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset buttons */}
              {scheduleMode === 'preset' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                    Choose Preset Shift Template
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PRESETS.map((preset) => {
                      const Icon = preset.icon;
                      return (
                        <div
                          key={preset.id}
                          className="p-3.5 rounded-2xl bg-[#F7F8F0] border border-[#7AAACE]/60 hover:border-[#355872] transition space-y-2"
                        >
                          <div className="flex items-center gap-2 font-bold text-xs text-[#355872]">
                            <div className="p-1.5 rounded-lg bg-white border border-[#7AAACE]/50">
                              <Icon size={14} className="text-[#355872]" />
                            </div>
                            <span>{preset.name}</span>
                          </div>
                          <p className="text-[11px] text-[#4A6478]">{preset.description}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setScheduleWorkingDays((prev) =>
                                  prev.map((d) =>
                                    d.dayOfWeek === scheduleSelectedDayId
                                      ? { ...d, active: true, startTime: preset.startTime, endTime: preset.endTime }
                                      : d
                                  )
                                );
                                toast.success(`Applied ${preset.name} to ${selectedDayConfig?.name}`);
                              }}
                              className="flex-1 py-1.5 px-2.5 bg-white hover:bg-[#355872] hover:text-white border border-[#7AAACE] text-[#355872] rounded-lg text-[11px] font-bold transition"
                            >
                              Apply to {selectedDayConfig?.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setScheduleWorkingDays((prev) =>
                                  prev.map((d) =>
                                    d.active
                                      ? { ...d, startTime: preset.startTime, endTime: preset.endTime }
                                      : d
                                  )
                                );
                                toast.success(`Applied ${preset.name} to all active shifts!`);
                              }}
                              className="py-1.5 px-2 bg-[#355872]/10 hover:bg-[#355872] hover:text-white text-[#355872] rounded-lg text-[11px] font-bold transition"
                            >
                              Apply All
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Working days schedule */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                  Weekly Shift Schedule
                </label>
                <div className="space-y-2">
                  {scheduleWorkingDays.map((d) => (
                    <div
                      key={d.dayOfWeek}
                      onClick={() => setScheduleSelectedDayId(d.dayOfWeek)}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                        scheduleSelectedDayId === d.dayOfWeek
                          ? 'ring-2 ring-[#355872] border-[#355872]'
                          : ''
                      } ${
                        d.active
                          ? 'bg-white border-[#7AAACE]'
                          : 'bg-[#F7F8F0]/60 border-[#7AAACE]/30 opacity-70'
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={d.active}
                          onChange={() => {
                            setScheduleWorkingDays((prev) =>
                              prev.map((item) =>
                                item.dayOfWeek === d.dayOfWeek ? { ...item, active: !item.active } : item
                              )
                            );
                            setScheduleSelectedDayId(d.dayOfWeek);
                          }}
                          className="w-4 h-4 rounded text-[#355872] focus:ring-[#9CD5FF] border-[#7AAACE]"
                        />
                        <span className={`text-xs font-bold ${d.active ? 'text-[#355872]' : 'text-[#4A6478]'}`}>
                          {d.name}
                        </span>
                      </label>

                      {d.active ? (
                        <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="time"
                            value={d.startTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setScheduleWorkingDays((prev) =>
                                prev.map((item) =>
                                  item.dayOfWeek === d.dayOfWeek ? { ...item, startTime: val } : item
                                )
                              );
                              setScheduleSelectedDayId(d.dayOfWeek);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-[#7AAACE] bg-[#F7F8F0] text-[#355872] font-semibold text-xs focus:outline-none"
                          />
                          <span className="text-[#4A6478] font-bold">to</span>
                          <input
                            type="time"
                            value={d.endTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setScheduleWorkingDays((prev) =>
                                prev.map((item) =>
                                  item.dayOfWeek === d.dayOfWeek ? { ...item, endTime: val } : item
                                )
                              );
                              setScheduleSelectedDayId(d.dayOfWeek);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-[#7AAACE] bg-[#F7F8F0] text-[#355872] font-semibold text-xs focus:outline-none"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#4A6478]">Off Duty</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              {selectedDayConfig?.active && (
                <div className="p-4 rounded-2xl bg-[#F7F8F0] border border-[#7AAACE]/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#355872]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#355872]" />
                      Slots Preview ({selectedDayConfig.name}: {selectedDayConfig.startTime} – {selectedDayConfig.endTime})
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#355872] text-white">
                      {schedulePreviewSlots.length} Slots
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                    {schedulePreviewSlots.map((slot, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#7AAACE]/50 text-[11px] font-bold text-[#355872]"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingSchedule}
                className="w-full py-3.5 bg-[#355872] hover:bg-[#233B4D] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50"
              >
                <Save size={15} />
                {isSavingSchedule ? 'Publishing Schedule...' : `Publish Slots for Dr. ${scheduleDoctor.user?.name}`}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* ── CREATE DOCTOR MODAL ──────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#355872]/40 backdrop-blur-xs">
          <div className="bg-white border border-[#7AAACE]/60 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(53,88,114,0.2)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#7AAACE]/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] flex items-center justify-center font-bold">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#355872] tracking-tight">
                    Onboard New Physician
                  </h2>
                  <p className="text-xs text-[#4A6478]">
                    A secure temporary password will be automatically emailed to the doctor.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-[#7AAACE] hover:text-[#355872] hover:bg-[#F7F8F0] rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newDoctor);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Gregory House"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F7F8F0] border border-[#7AAACE] rounded-xl text-xs font-medium text-[#355872] focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="house@clinic.com"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F7F8F0] border border-[#7AAACE] rounded-xl text-xs font-medium text-[#355872] focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                    Specialisation
                  </label>
                  <select
                    value={newDoctor.specialisation}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialisation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F7F8F0] border border-[#7AAACE] rounded-xl text-xs font-bold text-[#355872] focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
                  >
                    {['General Practice', 'Cardiology', 'Neurology', 'Dermatology', 'Pediatrics', 'Orthopedics'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                    Consultation Duration
                  </label>
                  <select
                    value={newDoctor.slotDuration}
                    onChange={(e) => setNewDoctor({ ...newDoctor, slotDuration: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#F7F8F0] border border-[#7AAACE] rounded-xl text-xs font-bold text-[#355872] focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
                  >
                    {[15, 20, 30, 45, 60].map((mins) => (
                      <option key={mins} value={mins}>{mins} Minutes</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                  Bio / Clinical Background
                </label>
                <textarea
                  rows={3}
                  placeholder="Medical background, board certifications..."
                  value={newDoctor.bio}
                  onChange={(e) => setNewDoctor({ ...newDoctor, bio: e.target.value })}
                  className="w-full p-3 bg-[#F7F8F0] border border-[#7AAACE] rounded-xl text-xs text-[#355872] focus:outline-none focus:ring-1 focus:ring-[#9CD5FF] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-3 bg-[#355872] hover:bg-[#233B4D] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(53,88,114,0.15)] active:scale-[0.98] disabled:opacity-50"
              >
                <Plus size={16} />
                {createMutation.isPending ? 'Registering...' : 'Complete Physician Onboarding'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── SCHEDULE LEAVE MODAL ────────────────────────────────────────────── */}
      {leaveDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#355872]/40 backdrop-blur-xs">
          <div className="bg-white border border-[#7AAACE]/60 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(53,88,114,0.2)]">
            <div className="flex items-center justify-between pb-4 border-b border-[#7AAACE]/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#D9A24B] flex items-center justify-center font-bold">
                  <CalendarOff size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#355872] tracking-tight">
                    Schedule Physician Leave
                  </h2>
                  <p className="text-xs text-[#4A6478]">{leaveDoctor.user?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setLeaveDoctor(null)}
                className="p-2 text-[#7AAACE] hover:text-[#355872] hover:bg-[#F7F8F0] rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                leaveMutation.mutate({
                  doctorId: leaveDoctor.id,
                  payload: { date: leaveDate, reason: leaveReason },
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                  Date of Absence
                </label>
                <input
                  type="date"
                  min={dayjs().format('YYYY-MM-DD')}
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F8F0] border border-[#7AAACE] rounded-xl text-xs font-semibold text-[#355872] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                  Reason for Absence
                </label>
                <input
                  type="text"
                  placeholder="Medical Conference / Personal Leave"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F8F0] border border-[#7AAACE] rounded-xl text-xs text-[#355872] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={leaveMutation.isPending}
                className="w-full py-3 bg-[#D9A24B] hover:bg-[#C28E3A] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50"
              >
                <CalendarOff size={15} />
                {leaveMutation.isPending ? 'Scheduling Leave...' : 'Confirm Leave & Notify Patients'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
