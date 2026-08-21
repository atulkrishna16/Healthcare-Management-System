import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { appointmentsApi } from '../../lib/api';
import dayjs from 'dayjs';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
  X,
  User,
  Mail,
  Brain,
  AlertCircle,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  ListFilter,
  Loader2,
} from 'lucide-react';
import DoctorScheduleModal from './DoctorScheduleModal';
import GoogleCalendarButton from '../../components/GoogleCalendarButton';
import { Calendar } from '@/components/ui/calendar';

const URGENCY_WEIGHT = { High: 0, Medium: 1, Low: 2 };
const PAGE_SIZE = 10;

export default function DoctorDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAll, setShowAll] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [activePatient, setActivePatient] = useState(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const loadMoreSentinelRef = useRef(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => appointmentsApi.list().then((r) => r.data),
  });

  const confirmedAppts = appointments.filter((a) => a.status === 'confirmed');

  // O(1) Set for fast day-picker modifiers
  const bookedDatesSet = useMemo(
    () => new Set(confirmedAppts.map((a) => dayjs(a.slotStart).format('YYYY-MM-DD'))),
    [confirmedAppts]
  );

  // Sorted appointments by urgency then time
  const sortedAppts = useMemo(() => {
    const list = showAll
      ? confirmedAppts
      : confirmedAppts.filter((a) => dayjs(a.slotStart).isSame(dayjs(selectedDate), 'day'));

    return [...list].sort((a, b) => {
      const uA = URGENCY_WEIGHT[a.symptomForm?.aiSummary?.urgency] ?? 3;
      const uB = URGENCY_WEIGHT[b.symptomForm?.aiSummary?.urgency] ?? 3;
      return uA - uB || new Date(a.slotStart) - new Date(b.slotStart);
    });
  }, [confirmedAppts, showAll, selectedDate]);

  const visibleAppts = sortedAppts.slice(0, visibleLimit);
  const hasMore = visibleLimit < sortedAppts.length;

  // Reset limit when switching filter or date
  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [showAll, selectedDate]);

  // Infinite Scroll / Lazy Loading Sentinel Observer
  useEffect(() => {
    if (!showAll) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleLimit < sortedAppts.length) {
          setVisibleLimit((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreSentinelRef.current) {
      observer.observe(loadMoreSentinelRef.current);
    }
    return () => observer.disconnect();
  }, [showAll, visibleLimit, sortedAppts.length]);

  const getAppointmentCountForDate = (date) => {
    return confirmedAppts.filter((a) => dayjs(a.slotStart).isSame(dayjs(date), 'day')).length;
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto bg-[#F7F8F0] text-[#355872]">
      {/* Top Banner / Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#7AAACE]/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#355872] uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[#355872]" />
            Clinical Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#355872] tracking-tight font-display">
            Practice Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#4A6478] mt-0.5">
            {dayjs().format('dddd, MMMM D, YYYY')} · Real-time patient triage & intake tracking
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <GoogleCalendarButton />
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm active:scale-[0.98]"
          >
            <Clock size={14} />
            Manage & Create Slots
          </button>
          <div className="px-4 py-2.5 rounded-xl bg-white border border-[#7AAACE]/60 text-xs font-bold text-[#355872] shadow-[0_2px_6px_rgba(53,88,114,0.06)]">
            {confirmedAppts.length} Active Bookings
          </div>
        </div>
      </div>

      <DoctorScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <div className="text-2xl sm:text-3xl font-black text-[#355872] font-display">
            {confirmedAppts.filter((a) => dayjs(a.slotStart).isSame(dayjs(), 'day')).length}
          </div>
          <div className="text-[11px] font-bold text-[#4A6478] uppercase tracking-wider mt-1">
            Today's Visits
          </div>
        </div>

        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <div className="text-2xl sm:text-3xl font-black text-[#355872] font-display">
            {confirmedAppts.length}
          </div>
          <div className="text-[11px] font-bold text-[#4A6478] uppercase tracking-wider mt-1">
            Total Confirmed
          </div>
        </div>

        <div className="bg-white border border-[#B5533C]/40 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <div className="text-2xl sm:text-3xl font-black text-[#B5533C] font-display">
            {confirmedAppts.filter((a) => a.symptomForm?.aiSummary?.urgency === 'High').length}
          </div>
          <div className="text-[11px] font-bold text-[#B5533C] uppercase tracking-wider mt-1">
            High Urgency
          </div>
        </div>

        <div className="bg-white border border-[#7AAACE]/60 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <div className="text-2xl sm:text-3xl font-black text-[#355872] font-display">
            {appointments.filter((a) => a.status === 'completed').length}
          </div>
          <div className="text-[11px] font-bold text-[#4A6478] uppercase tracking-wider mt-1">
            Completed Visits
          </div>
        </div>
      </div>

      {/* Main Dual-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Appointment Schedule List */}
        <div className="lg:col-span-7 space-y-4">
          {/* List Header with Filter Switcher */}
          <div className="flex items-center justify-between pb-2 gap-2 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-[#355872] tracking-tight flex items-center gap-2">
                <span>{showAll ? 'All Scheduled Appointments' : `Roster for ${dayjs(selectedDate).format('MMMM D, YYYY')}`}</span>
                <span className="text-xs font-semibold text-[#4A6478]">
                  ({visibleAppts.length} of {sortedAppts.length})
                </span>
              </h2>
            </div>

            {/* Filter Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-white border border-[#7AAACE]/60 p-1 rounded-xl shadow-sm text-xs">
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  !showAll
                    ? 'bg-[#355872] text-white shadow-sm'
                    : 'text-[#4A6478] hover:text-[#355872]'
                }`}
              >
                Date Only
              </button>

              <button
                type="button"
                onClick={() => setShowAll(true)}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  showAll
                    ? 'bg-[#355872] text-white shadow-sm'
                    : 'text-[#4A6478] hover:text-[#355872]'
                }`}
              >
                Show All ({confirmedAppts.length})
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-[#4A6478] bg-white border border-[#7AAACE]/60 rounded-2xl">
              Loading clinical data...
            </div>
          ) : sortedAppts.length === 0 ? (
            <div className="p-12 text-center bg-white border border-[#7AAACE]/60 rounded-2xl text-[#4A6478] space-y-2">
              <CalendarIcon size={32} className="mx-auto text-[#7AAACE] opacity-60" />
              <p className="text-sm font-bold text-[#355872]">No confirmed visits found.</p>
              <p className="text-xs text-[#4A6478]">Select another calendar day or click "Show All".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAppts.map((appt) => {
                const urgency = appt.symptomForm?.aiSummary?.urgency;
                return (
                  <div
                    key={appt.id}
                    onClick={() => setActivePatient(appt)}
                    className="p-5 rounded-2xl bg-white border border-[#7AAACE]/60 hover:border-[#355872] transition-all cursor-pointer shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] flex items-center justify-between gap-4 group border-l-4 border-l-[#7AAACE]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <span className="text-base font-bold text-[#355872] group-hover:text-[#233B4D] transition-colors">
                          {appt.patient?.name || 'Patient'}
                        </span>
                        
                        {urgency === 'High' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B5533C] text-white border border-[#B5533C] flex items-center gap-1">
                            <AlertCircle size={11} /> High Urgency
                          </span>
                        )}
                        {urgency === 'Medium' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9A24B] text-white border border-[#D9A24B]">
                            Medium Urgency
                          </span>
                        )}
                        {urgency === 'Low' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9CD5FF] text-[#355872] border border-[#7AAACE]">
                            Low Urgency
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#4A6478] flex-wrap">
                        {showAll && (
                          <span className="font-bold text-[#355872] bg-[#F7F8F0] px-2 py-0.5 rounded-md border border-[#7AAACE]/50">
                            {dayjs(appt.slotStart).format('MMM D, YYYY')}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-medium">
                          <Clock size={13} className="text-[#7AAACE]" />
                          {dayjs(appt.slotStart).format('h:mm A')} – {dayjs(appt.slotEnd).format('h:mm A')}
                        </span>
                        {appt.symptomForm?.aiSummary?.chiefComplaint && (
                          <span className="text-[#4A6478] truncate hidden sm:inline">
                            · {appt.symptomForm.aiSummary.chiefComplaint}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Link
                        to={`/doctor/appointments/${appt.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3.5 py-2 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-xs font-bold text-white transition active:scale-[0.97]"
                      >
                        Visit Notes
                      </Link>
                      <ChevronRight size={18} className="text-[#7AAACE] group-hover:text-[#355872] transition-colors" />
                    </div>
                  </div>
                );
              })}

              {/* Lazy Loading Sentinel Element */}
              {hasMore && (
                <div
                  ref={loadMoreSentinelRef}
                  className="py-4 text-center text-xs text-[#4A6478] flex items-center justify-center gap-2 bg-white/60 rounded-xl border border-[#7AAACE]/40"
                >
                  <Loader2 size={15} className="animate-spin text-[#355872]" />
                  <span>Loading more appointments...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Schedule Calendar */}
        <div className="lg:col-span-5 bg-white border border-[#7AAACE]/60 rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
              <CalendarIcon size={15} className="text-[#355872]" />
              Schedule Calendar
            </h2>
            
            {/* Direct Jump to Custom Date & Year */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#4A6478] uppercase">Jump:</span>
              <input
                type="date"
                value={dayjs(selectedDate).format('YYYY-MM-DD')}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    setSelectedDate(new Date(year, month - 1, day));
                  }
                }}
                className="text-xs font-bold text-[#355872] bg-[#F7F8F0] border border-[#7AAACE] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#9CD5FF]"
              />
            </div>
          </div>

          <div className="bg-[#F7F8F0] border border-[#7AAACE]/50 rounded-xl p-3 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={selectedDate}
              onMonthChange={setSelectedDate}
              captionLayout="dropdown"
              startMonth={new Date(2020, 0)}
              endMonth={new Date(2035, 11)}
              className="bg-transparent border-0"
              modifiers={{
                booked: (date) => bookedDatesSet.has(dayjs(date).format('YYYY-MM-DD')),
              }}
              modifiersClassNames={{
                booked: 'underline decoration-[#355872] decoration-2 font-bold',
              }}
            />
          </div>

          <div className="p-3.5 bg-[#F7F8F0] border border-[#7AAACE]/40 rounded-xl text-xs text-[#4A6478] flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#355872] shrink-0" />
            <span>Select any date or use the Jump date picker to view schedules across any year.</span>
          </div>
        </div>

      </div>

      {/* Patient Detail Modal Sheet */}
      {activePatient && (
        <div className="fixed inset-0 z-50 bg-[#355872]/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white border border-[#7AAACE] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(53,88,114,0.2)] relative space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#7AAACE]/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] flex items-center justify-center font-bold">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#355872] font-display">
                    {activePatient.patient?.name}
                  </h3>
                  <div className="text-xs text-[#4A6478] flex items-center gap-2">
                    <Mail size={12} className="text-[#7AAACE]" />
                    {activePatient.patient?.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActivePatient(null)}
                className="w-9 h-9 rounded-full bg-[#F7F8F0] hover:bg-[#EEF0E5] text-[#355872] flex items-center justify-center transition border border-[#7AAACE]/60"
              >
                <X size={18} />
              </button>
            </div>

            {/* Appointment Time Information */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F7F8F0] border border-[#7AAACE]/60 rounded-2xl text-xs">
              <div>
                <span className="text-[#4A6478] font-bold block uppercase tracking-wider text-[10px]">
                  Scheduled Slot
                </span>
                <span className="text-[#355872] font-bold mt-0.5 block">
                  {dayjs(activePatient.slotStart).format('dddd, MMMM D, YYYY')}
                </span>
              </div>
              <div>
                <span className="text-[#4A6478] font-bold block uppercase tracking-wider text-[10px]">
                  Time Window
                </span>
                <span className="text-[#355872] font-bold mt-0.5 block">
                  {dayjs(activePatient.slotStart).format('h:mm A')} – {dayjs(activePatient.slotEnd).format('h:mm A')}
                </span>
              </div>
            </div>

            {/* AI Intake Summary Section */}
            {activePatient.symptomForm ? (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-[#F7F8F0] border border-[#7AAACE] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#355872] text-xs font-bold uppercase tracking-wider">
                      <Brain size={15} className="text-[#7AAACE]" />
                      AI Clinical Intake Assessment
                    </div>
                    {activePatient.symptomForm.aiSummary?.urgency === 'High' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B5533C] text-white">
                        High Urgency
                      </span>
                    )}
                    {activePatient.symptomForm.aiSummary?.urgency === 'Medium' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9A24B] text-white">
                        Medium Urgency
                      </span>
                    )}
                    {activePatient.symptomForm.aiSummary?.urgency === 'Low' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9CD5FF] text-[#355872]">
                        Low Urgency
                      </span>
                    )}
                  </div>

                  {activePatient.symptomForm.aiStatus === 'ok' && activePatient.symptomForm.aiSummary ? (
                    <div className="space-y-3 text-xs sm:text-sm text-[#355872]">
                      <div>
                        <strong className="text-[#355872] block mb-0.5">Chief Complaint:</strong>
                        <p className="text-[#4A6478] leading-relaxed">
                          {activePatient.symptomForm.aiSummary.chiefComplaint}
                        </p>
                      </div>

                      {activePatient.symptomForm.aiSummary.suggestedQuestions?.length > 0 && (
                        <div>
                          <strong className="text-[#355872] block mb-1">Recommended Follow-up Inquiries:</strong>
                          <ul className="list-disc list-inside space-y-1 text-[#4A6478] text-xs">
                            {activePatient.symptomForm.aiSummary.suggestedQuestions.map((q, idx) => (
                              <li key={idx}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-[#D9A24B] font-bold flex items-center gap-2">
                      <AlertTriangle size={14} />
                      AI summary extraction is pending or raw notes below:
                    </div>
                  )}
                </div>

                {/* Raw Intake Notes */}
                <div className="p-4 rounded-2xl bg-[#F7F8F0] border border-[#7AAACE]/60 text-xs space-y-1">
                  <span className="text-[#4A6478] font-bold uppercase tracking-wider text-[10px] block">
                    Patient-Reported Intake Narrative
                  </span>
                  <p className="text-[#355872] leading-relaxed">
                    {activePatient.symptomForm.symptoms}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-[#F7F8F0] border border-[#7AAACE]/60 rounded-2xl text-xs text-[#4A6478]">
                No symptom intake form recorded for this appointment.
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActivePatient(null)}
                className="px-4 py-2.5 rounded-xl bg-[#F7F8F0] hover:bg-[#EEF0E5] border border-[#7AAACE]/60 text-xs font-bold text-[#355872] transition"
              >
                Dismiss
              </button>
              <Link
                to={`/doctor/appointments/${activePatient.id}`}
                className="px-5 py-2.5 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-xs font-bold text-white transition flex items-center gap-1.5 shadow-[0_4px_12px_rgba(53,88,114,0.15)]"
              >
                <FileText size={14} />
                Open Visit Notes
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
