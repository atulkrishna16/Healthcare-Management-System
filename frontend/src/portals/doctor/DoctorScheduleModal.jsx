import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorsApi } from '../../lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  Clock,
  Calendar as CalendarIcon,
  X,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Settings,
} from 'lucide-react';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 0, name: 'Sunday' },
];

export default function DoctorScheduleModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['doctor-own-schedule'],
    queryFn: () => doctorsApi.getOwnSchedule().then((r) => r.data),
    enabled: isOpen,
  });

  const [slotDuration, setSlotDuration] = useState(30);
  const [workingDays, setWorkingDays] = useState([]);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (scheduleData) {
      setSlotDuration(scheduleData.slotDuration || 30);
      const whMap = new Map((scheduleData.workingHours || []).map((h) => [h.dayOfWeek, h]));
      setWorkingDays(DAYS.map((d) => ({
        dayOfWeek: d.id,
        name: d.name,
        active: whMap.has(d.id),
        startTime: whMap.get(d.id)?.startTime || '09:00',
        endTime: whMap.get(d.id)?.endTime || '17:00',
      })));
    }
  }, [scheduleData]);

  const toggleDay = (dayId) => {
    setWorkingDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayId ? { ...d, active: !d.active } : d))
    );
  };

  const updateTime = (dayId, field, value) => {
    setWorkingDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayId ? { ...d, [field]: value } : d))
    );
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await doctorsApi.updateOwnSchedule({
        slotDuration: Number(slotDuration),
        workingHours: workingDays,
      });
      toast.success('Consultation hours & slot availability saved!');
      queryClient.invalidateQueries(['doctor-own-schedule']);
      queryClient.invalidateQueries(['doctor-appointments']);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLeave = async (e) => {
    e.preventDefault();
    if (!leaveDate) return toast.error('Please select a date');
    try {
      await doctorsApi.addOwnLeave({ date: leaveDate, reason: leaveReason });
      toast.success(`Time off recorded for ${dayjs(leaveDate).format('MMM D, YYYY')}`);
      setLeaveDate('');
      setLeaveReason('');
      queryClient.invalidateQueries(['doctor-own-schedule']);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record leave');
    }
  };

  const handleDeleteLeave = async (id) => {
    try {
      await doctorsApi.deleteOwnLeave(id);
      toast.success('Leave cancelled');
      queryClient.invalidateQueries(['doctor-own-schedule']);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove leave');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#355872]/40 backdrop-blur-xs">
      <div className="bg-white border border-[#7AAACE]/60 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(53,88,114,0.2)] max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#7AAACE]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] flex items-center justify-center font-bold">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#355872] tracking-tight">
                Manage Consultation Hours & Availability
              </h2>
              <p className="text-xs text-[#4A6478]">
                Customize your weekly shift times, slot intervals, and planned time off.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#7AAACE] hover:text-[#355872] hover:bg-[#F7F8F0] rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#4A6478]">Loading current availability...</div>
        ) : (
          <form onSubmit={handleSaveSchedule} className="space-y-6">
            
            {/* Slot Duration Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                Appointment Slot Duration (Minutes)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 20, 30, 45].map((mins) => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => setSlotDuration(mins)}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      Number(slotDuration) === mins
                        ? 'bg-[#355872] text-white border-[#355872] shadow-sm'
                        : 'bg-[#F7F8F0] text-[#355872] border-[#7AAACE]/60 hover:bg-white'
                    }`}
                  >
                    {mins} Mins
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Working Days & Hours */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                Weekly Active Shifts
              </label>

              <div className="space-y-2">
                {workingDays.map((d) => (
                  <div
                    key={d.dayOfWeek}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      d.active
                        ? 'bg-white border-[#7AAACE]'
                        : 'bg-[#F7F8F0]/60 border-[#7AAACE]/30 opacity-70'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={d.active}
                        onChange={() => toggleDay(d.dayOfWeek)}
                        className="w-4 h-4 rounded text-[#355872] focus:ring-[#9CD5FF] border-[#7AAACE]"
                      />
                      <span className={`text-xs font-bold ${d.active ? 'text-[#355872]' : 'text-[#4A6478]'}`}>
                        {d.name}
                      </span>
                    </label>

                    {d.active ? (
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="time"
                          value={d.startTime}
                          onChange={(e) => updateTime(d.dayOfWeek, 'startTime', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#7AAACE] bg-[#F7F8F0] text-[#355872] font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
                        />
                        <span className="text-[#4A6478] font-bold">to</span>
                        <input
                          type="time"
                          value={d.endTime}
                          onChange={(e) => updateTime(d.dayOfWeek, 'endTime', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#7AAACE] bg-[#F7F8F0] text-[#355872] font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
                        />
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#4A6478]">Off Duty</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save Shifts Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-[#355872] hover:bg-[#233B4D] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50"
              >
                <Save size={15} />
                {isSaving ? 'Saving Changes...' : 'Save Availability & Shift Schedule'}
              </button>
            </div>
          </form>
        )}

        {/* Time Off & Leaves Section */}
        <div className="pt-6 border-t border-[#7AAACE]/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
              <CalendarIcon size={14} className="text-[#355872]" />
              Schedule Time Off / Leaves
            </h3>
            <p className="text-[11px] text-[#4A6478]">
              Slots on declared leave dates will be hidden automatically from patient booking.
            </p>
          </div>

          <form onSubmit={handleAddLeave} className="flex flex-col sm:flex-row gap-2">
            <input
              type="date"
              min={dayjs().format('YYYY-MM-DD')}
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="px-3 py-2 bg-[#F7F8F0] border border-[#7AAACE] rounded-xl text-xs font-semibold text-[#355872] focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
              required
            />
            <input
              type="text"
              placeholder="Reason (e.g. Annual Medical Conference)"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#F7F8F0] border border-[#7AAACE] rounded-xl text-xs text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#355872] hover:bg-[#233B4D] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus size={14} />
              Add Time Off
            </button>
          </form>

          {/* List of existing leaves */}
          {scheduleData?.leaves?.length > 0 && (
            <div className="space-y-1.5 pt-2">
              {scheduleData.leaves.map((l) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#355872]">
                      {dayjs(l.date).format('MMMM D, YYYY')}
                    </span>
                    {l.reason && <span className="text-[#4A6478]">— {l.reason}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteLeave(l.id)}
                    className="text-[#B5533C] hover:text-[#933D2A] p-1 rounded transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
