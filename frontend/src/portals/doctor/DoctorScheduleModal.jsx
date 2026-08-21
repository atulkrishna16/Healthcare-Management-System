import { useState, useEffect, useMemo } from 'react';
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
  Sparkles,
  CalendarDays,
  Sun,
  Sunrise,
  Moon,
  Building,
  Wand2,
  SlidersHorizontal,
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

const PRESETS = [
  {
    id: 'morning',
    name: 'Morning Shift',
    icon: Sunrise,
    startTime: '08:00',
    endTime: '12:00',
    description: 'Slices multiple slots across 08:00 AM – 12:00 PM',
  },
  {
    id: 'afternoon',
    name: 'Forenoon / Afternoon',
    icon: Sun,
    startTime: '12:00',
    endTime: '16:00',
    description: 'Slices multiple slots across 12:00 PM – 04:00 PM',
  },
  {
    id: 'evening',
    name: 'Evening / Night Shift',
    icon: Moon,
    startTime: '17:00',
    endTime: '21:00',
    description: 'Slices multiple slots across 05:00 PM – 09:00 PM',
  },
  {
    id: 'fullday',
    name: 'Full Day Shift',
    icon: Building,
    startTime: '09:00',
    endTime: '17:00',
    description: 'Slices all-day consecutive slots across 09:00 AM – 05:00 PM',
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
    slots.push({
      start: slotStartFormatted,
      end: slotEndFormatted,
      label: `${slotStartFormatted} – ${slotEndFormatted}`,
    });
    current = nextTime;
  }
  return slots;
}

export default function DoctorScheduleModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['doctor-own-schedule'],
    queryFn: () => doctorsApi.getOwnSchedule().then((r) => r.data),
    enabled: isOpen,
  });

  const [mode, setMode] = useState('preset'); // 'preset' | 'manual'
  const [slotDuration, setSlotDuration] = useState(30);
  const [workingDays, setWorkingDays] = useState([]);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState(1);

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

  const applyPresetToDay = (dayId, preset) => {
    setWorkingDays((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayId
          ? { ...d, active: true, startTime: preset.startTime, endTime: preset.endTime }
          : d
      )
    );
    toast.success(`Applied ${preset.name} (${preset.startTime} – ${preset.endTime})`);
  };

  const applyPresetToAllActiveDays = (preset) => {
    setWorkingDays((prev) =>
      prev.map((d) =>
        d.active
          ? { ...d, startTime: preset.startTime, endTime: preset.endTime }
          : d
      )
    );
    toast.success(`Applied ${preset.name} to all active shifts!`);
  };

  const selectedDayConfig = workingDays.find((d) => d.dayOfWeek === selectedDayId) || workingDays[0];
  const previewSlots = useMemo(() => {
    if (!selectedDayConfig || !selectedDayConfig.active) return [];
    return generatePreviewSlots(selectedDayConfig.startTime, selectedDayConfig.endTime, Number(slotDuration));
  }, [selectedDayConfig, slotDuration]);

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const activeWorkingHours = workingDays
      .filter((d) => d.active)
      .map((d) => ({
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
      }));

    try {
      await doctorsApi.updateOwnSchedule({
        slotDuration: Number(slotDuration),
        workingHours: activeWorkingHours,
      });

      toast.success('Shift schedule & slots published successfully!');
      queryClient.invalidateQueries(['doctor-own-schedule']);
      queryClient.invalidateQueries(['doctor-appointments']);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update schedule');
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
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#355872] tracking-tight">
                Slot & Shift Schedule Builder
              </h2>
              <p className="text-xs text-[#4A6478]">
                Generate multiple bookable slots automatically using presets or manual custom shift hours.
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

        {/* Mode Selector Tabs (Automatic Presets vs Manual Custom) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#F7F8F0] border border-[#7AAACE]/50 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('preset')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'preset'
                ? 'bg-[#355872] text-white shadow-sm'
                : 'text-[#355872] hover:text-[#233B4D]'
            }`}
          >
            <Wand2 size={14} />
            1. Automatic Preset Shifts
          </button>

          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'manual'
                ? 'bg-[#355872] text-white shadow-sm'
                : 'text-[#355872] hover:text-[#233B4D]'
            }`}
          >
            <SlidersHorizontal size={14} />
            2. Manual Custom Slot Times
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#4A6478]">Loading current availability...</div>
        ) : (
          <form onSubmit={handleSaveSchedule} className="space-y-6">
            
            {/* Slot Duration Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                Appointment Slot Duration (Minutes Per Consultation)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[15, 20, 30, 45, 60].map((mins) => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => setSlotDuration(mins)}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      Number(slotDuration) === mins
                        ? 'bg-[#355872] text-white border-[#355872] shadow-sm'
                        : 'bg-[#F7F8F0] text-[#355872] border-[#7AAACE]/60 hover:bg-white'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* ── MODE 1: AUTOMATIC PRESETS ─────────────────────────────────── */}
            {mode === 'preset' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                    Choose Shift Preset (Slices into Multiple Slots)
                  </label>
                  <span className="text-[10px] text-[#4A6478] font-bold">
                    Target: {selectedDayConfig?.name}
                  </span>
                </div>

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
                            onClick={() => applyPresetToDay(selectedDayId, preset)}
                            className="flex-1 py-1.5 px-2.5 bg-white hover:bg-[#355872] hover:text-white border border-[#7AAACE] text-[#355872] rounded-lg text-[11px] font-bold transition shadow-2xs"
                          >
                            Apply to {selectedDayConfig?.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPresetToAllActiveDays(preset)}
                            className="py-1.5 px-2 bg-[#355872]/10 hover:bg-[#355872] hover:text-white text-[#355872] rounded-lg text-[11px] font-bold transition"
                            title="Apply to all active work days"
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

            {/* ── Active Shifts & Custom Times Per Day ──────────────────────── */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                Weekly Shift Schedule & Custom Start / End Times
              </label>

              <div className="space-y-2">
                {workingDays.map((d) => (
                  <div
                    key={d.dayOfWeek}
                    onClick={() => setSelectedDayId(d.dayOfWeek)}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                      selectedDayId === d.dayOfWeek
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
                          toggleDay(d.dayOfWeek);
                          setSelectedDayId(d.dayOfWeek);
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
                            updateTime(d.dayOfWeek, 'startTime', e.target.value);
                            setSelectedDayId(d.dayOfWeek);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#7AAACE] bg-[#F7F8F0] text-[#355872] font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
                        />
                        <span className="text-[#4A6478] font-bold">to</span>
                        <input
                          type="time"
                          value={d.endTime}
                          onChange={(e) => {
                            updateTime(d.dayOfWeek, 'endTime', e.target.value);
                            setSelectedDayId(d.dayOfWeek);
                          }}
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

            {/* Live Generated Slots Preview */}
            {selectedDayConfig?.active && (
              <div className="p-4 rounded-2xl bg-[#F7F8F0] border border-[#7AAACE]/60 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#355872]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#355872]" />
                    Generated Patient Slots Preview ({selectedDayConfig.name}: {selectedDayConfig.startTime} – {selectedDayConfig.endTime})
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#355872] text-white">
                    {previewSlots.length} Multiple Slots
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto pt-1">
                  {previewSlots.length > 0 ? (
                    previewSlots.map((slot, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-[#7AAACE]/50 text-center shadow-2xs"
                      >
                        <div className="text-[11px] font-bold text-[#355872]">{slot.start}</div>
                        <div className="text-[9px] text-[#4A6478] font-semibold">to {slot.end}</div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-xs text-[#B5533C] py-2">
                      Invalid time range. End time must be later than start time.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Shifts Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 bg-[#355872] hover:bg-[#233B4D] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50"
              >
                <Save size={15} />
                {isSaving ? 'Publishing Slots...' : 'Publish Generated Slots to Patients'}
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
              className="flex-1 px-3 py-2 bg-[#F7F8F0] border border-[#7AAACE] rounded-xl text-xs text-[#355872] focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#355872] hover:bg-[#233B4D] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <Plus size={14} />
              Add Time Off
            </button>
          </form>

          {/* List of active leaves */}
          {scheduleData?.leaves?.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-bold text-[#4A6478] uppercase tracking-wider">
                Active Planned Leaves
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {scheduleData.leaves.map((l) => (
                  <div
                    key={l.id}
                    className="p-2.5 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#355872]">
                        {dayjs(l.date).format('MMM D, YYYY')}
                      </span>
                      {l.reason && <span className="text-[#4A6478] ml-2">({l.reason})</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteLeave(l.id)}
                      className="p-1 text-[#B5533C] hover:bg-[#B5533C]/10 rounded-lg transition"
                      title="Cancel Leave"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
