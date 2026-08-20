import { useState } from 'react';
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
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminDoctors() {
  const qc = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [leaveDoctor, setLeaveDoctor] = useState(null);
  const [leaveDate, setLeaveDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [leaveReason, setLeaveReason] = useState('');

  const [newDoctor, setNewDoctor] = useState({
    name: '',
    email: '',
    password: '',
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
    queryFn: () => adminApi.listDoctors().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => adminApi.createDoctor(payload),
    onSuccess: () => {
      toast.success('Physician profile created successfully');
      setShowCreateModal(false);
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
      setNewDoctor({
        name: '',
        email: '',
        password: '',
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
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create physician'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteDoctor(id),
    onSuccess: () => {
      toast.success('Physician removed');
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Delete failed'),
  });

  const leaveMutation = useMutation({
    mutationFn: ({ doctorId, date, reason }) => adminApi.addLeave(doctorId, { date, reason }),
    onSuccess: (res) => {
      const count = res.data?.cancelledAppointmentsCount ?? 0;
      toast.success(`Leave scheduled. ${count} conflicting visit(s) automatically cancelled & notified.`);
      setLeaveDoctor(null);
      qc.invalidateQueries({ queryKey: ['admin-doctors'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Leave scheduling failed'),
  });

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto bg-[#F7F8F0] text-[#355872]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#7AAACE]/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#355872] uppercase tracking-wider mb-1">
            <Users size={14} className="text-[#355872]" />
            Medical Staff Rostering
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#355872] tracking-tight font-display">
            Physicians & Staff
          </h1>
          <p className="text-xs sm:text-sm text-[#4A6478] mt-0.5">
            Manage provider profiles, consultation durations, and schedule leave with cascade patient notifications
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

      {/* Doctors Table */}
      <div className="bg-white border border-[#7AAACE]/60 rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#7AAACE]/40 bg-[#F7F8F0] hover:bg-[#F7F8F0]">
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider pl-6">Physician</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider">Specialisation</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider">Slot Time</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider">Active Bookings</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[#4A6478]">
                  Loading physician registry...
                </TableCell>
              </TableRow>
            ) : doctors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[#4A6478]">
                  No physician profiles found. Click "Register Physician" to add staff.
                </TableCell>
              </TableRow>
            ) : (
              doctors.map((doc) => (
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
                      onClick={() => setLeaveDoctor(doc)}
                      className="px-3 py-1.5 rounded-lg bg-[#F7F8F0] hover:bg-[#EEF0E5] text-[#D9A24B] border border-[#D9A24B]/50 text-xs font-bold transition active:scale-[0.97] inline-flex items-center gap-1.5"
                    >
                      <CalendarOff size={13} />
                      Leave
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Remove physician profile for ${doc.user?.name}?`)) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-[#4A6478] hover:text-[#B5533C] hover:bg-[#B5533C]/10 transition inline-flex"
                    >
                      <Trash2 size={15} />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Doctor Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#355872]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white border border-[#7AAACE] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(53,88,114,0.2)] space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#7AAACE]/40">
              <div className="flex items-center gap-2 text-[#355872] font-bold text-base font-display">
                <Stethoscope size={18} />
                Register New Physician
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-[#F7F8F0] hover:bg-[#EEF0E5] text-[#355872] flex items-center justify-center transition border border-[#7AAACE]/60"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newDoctor);
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="text-[#4A6478] font-bold block uppercase tracking-wider text-[10px]">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Emily Watson"
                  className="w-full p-3 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872]"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#4A6478] font-bold block uppercase tracking-wider text-[10px]">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="emily@clinic.com"
                    className="w-full p-3 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872]"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#4A6478] font-bold block uppercase tracking-wider text-[10px]">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full p-3 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872]"
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#4A6478] font-bold block uppercase tracking-wider text-[10px]">Specialisation</label>
                  <input
                    type="text"
                    required
                    placeholder="Cardiology"
                    className="w-full p-3 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872]"
                    value={newDoctor.specialisation}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialisation: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#4A6478] font-bold block uppercase tracking-wider text-[10px]">Slot Length (Minutes)</label>
                  <select
                    className="w-full p-3 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] focus:outline-none focus:border-[#355872]"
                    value={newDoctor.slotDuration}
                    onChange={(e) => setNewDoctor({ ...newDoctor, slotDuration: Number(e.target.value) })}
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={20}>20 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#7AAACE]/40">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#F7F8F0] text-[#355872] text-xs font-bold hover:bg-[#EEF0E5] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#355872] text-white text-xs font-bold hover:bg-[#233B4D] transition shadow-[0_4px_12px_rgba(53,88,114,0.15)] disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Register Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Leave Modal */}
      {leaveDoctor && (
        <div className="fixed inset-0 z-50 bg-[#355872]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-[#7AAACE] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(53,88,114,0.2)] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#7AAACE]/40">
              <div className="flex items-center gap-2 text-[#D9A24B] font-bold text-base font-display">
                <CalendarOff size={18} />
                Schedule Physician Leave
              </div>
              <button
                onClick={() => setLeaveDoctor(null)}
                className="w-8 h-8 rounded-full bg-[#F7F8F0] hover:bg-[#EEF0E5] text-[#355872] flex items-center justify-center transition border border-[#7AAACE]/60"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#D9A24B]/10 border border-[#D9A24B]/30 text-xs text-[#355872] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#D9A24B]">
                <ShieldAlert size={14} />
                Automatic Cascade Action
              </div>
              <p className="leading-relaxed">
                Scheduling leave for <strong>{leaveDoctor.user?.name}</strong> on this date will atomically cancel all conflicting appointments and dispatch reschedule notices to affected patients via BullMQ.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                leaveMutation.mutate({ doctorId: leaveDoctor.id, date: leaveDate, reason: leaveReason });
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="text-[#4A6478] font-bold block uppercase tracking-wider text-[10px]">Leave Date</label>
                <input
                  type="date"
                  required
                  className="w-full p-3 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] focus:outline-none focus:border-[#355872]"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#4A6478] font-bold block uppercase tracking-wider text-[10px]">Reason for Leave</label>
                <input
                  type="text"
                  placeholder="Medical Conference / Personal Leave"
                  className="w-full p-3 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872]"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#7AAACE]/40">
                <button
                  type="button"
                  onClick={() => setLeaveDoctor(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#F7F8F0] text-[#355872] text-xs font-bold hover:bg-[#EEF0E5] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaveMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#D9A24B] hover:bg-[#c48e3d] text-white text-xs font-bold transition shadow-[0_4px_12px_rgba(217,162,75,0.25)] disabled:opacity-50"
                >
                  {leaveMutation.isPending ? 'Processing...' : 'Confirm Leave & Cancel Visits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
