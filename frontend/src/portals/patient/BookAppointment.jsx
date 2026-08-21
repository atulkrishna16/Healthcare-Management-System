import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { doctorsApi, appointmentsApi } from '../../lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  Stethoscope,
  Send,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const STEPS = ['Select Date & Time', 'Describe Symptoms', 'Review & Confirm'];

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(false);

  const formattedDate = dayjs(selectedDate).format('YYYY-MM-DD');

  const { data: doctor } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => doctorsApi.get(doctorId).then((r) => r.data),
    enabled: !!doctorId,
  });

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', doctorId, formattedDate],
    queryFn: () => doctorsApi.getSlots(doctorId, formattedDate).then((r) => r.data),
    enabled: !!doctorId && !!formattedDate,
  });

  const slots = Array.isArray(slotsData) ? slotsData : (slotsData?.slots || []);

  const handleHoldSlot = async (slot) => {
    setSelectedSlot(slot);
    setLoading(true);
    const slotStart = slot.slotStart || slot.start;
    try {
      const res = await appointmentsApi.hold({
        doctorId,
        slotStart,
      });
      setAppointment(res.data.appointment || res.data);
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to hold slot. It may have just been booked.');
    } finally {
      setLoading(false);
    }
  };

  const handleSymptomsSubmit = async (e) => {
    e.preventDefault();
    if (!symptoms.trim()) return toast.error('Please describe your symptoms');
    setLoading(true);
    try {
      const res = await appointmentsApi.submitSymptoms(appointment.id, { symptoms });
      setAppointment(res.data.appointment || res.data);
      setStep(2);
    } catch (err) {
      if (err.response?.status === 410) {
        toast.error('Hold expired. Please select your slot again.');
        setStep(0);
        setAppointment(null);
      } else {
        toast.error(err.response?.data?.error || 'Failed to submit symptoms');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await appointmentsApi.confirm(appointment.id);
      toast.success('Consultation confirmed! Calendar invite dispatched.');
      navigate('/patient/appointments');
    } catch (err) {
      if (err.response?.status === 410) {
        toast.error('Hold expired. Please start over.');
        setStep(0);
        setAppointment(null);
      } else {
        toast.error(err.response?.data?.error || 'Confirmation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl bg-[#F7F8F0] text-[#355872]">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/patient" className="text-[#355872] hover:text-[#233B4D] font-bold">
                Dashboard
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-[#7AAACE]" />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/patient/search" className="text-[#355872] hover:text-[#233B4D] font-bold">
                Find Doctor
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-[#7AAACE]" />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-bold text-[#355872]">
              Schedule Consultation
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header & Doctor Summary Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#7AAACE]/40">
        <div>
          <div className="text-xs font-bold text-[#355872] uppercase tracking-wider">
            Appointment Intake
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#355872] tracking-tight font-display">
            Book with {doctor ? doctor.name : 'Physician'}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A6478] font-medium mt-1">
            {doctor ? `${doctor.specialisation} · ${doctor.slotDuration} min consultations` : 'Loading profile...'}
          </p>
        </div>

        <Link
          to="/patient/search"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#7AAACE] rounded-xl text-xs font-bold text-[#355872] hover:bg-[#9CD5FF]/20 transition shadow-sm w-fit"
        >
          <ArrowLeft size={14} />
          Change Specialist
        </Link>
      </div>

      {/* Stepper Progress Indicator */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {STEPS.map((s, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
              step === idx
                ? 'bg-[#355872] border-[#355872] text-white shadow-sm'
                : step > idx
                ? 'bg-white border-[#7AAACE] text-[#355872]'
                : 'bg-white/60 border-[#7AAACE]/40 text-[#4A6478]/60'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === idx
                  ? 'bg-[#9CD5FF] text-[#355872]'
                  : step > idx
                  ? 'bg-[#355872] text-white'
                  : 'bg-[#F7F8F0] text-[#4A6478]'
              }`}
            >
              {step > idx ? '✓' : idx + 1}
            </div>
            <span className="text-xs font-bold truncate hidden sm:inline">{s}</span>
          </div>
        ))}
      </div>

      {/* Temporary Hold Alert */}
      {appointment?.status === 'held' && step > 0 && (
        <Alert className="bg-[#9CD5FF]/30 border-[#7AAACE] text-[#355872]">
          <Lock size={16} className="text-[#355872]" />
          <AlertTitle className="text-xs font-bold uppercase tracking-wider text-[#355872]">
            Slot Temporarily Reserved (5-Minute Hold)
          </AlertTitle>
          <AlertDescription className="text-xs text-[#4A6478]">
            Please complete intake information before the hold expires.
          </AlertDescription>
        </Alert>
      )}

      {/* STEP 0: Select Date & Time */}
      {step === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Calendar Day Picker */}
          <div className="lg:col-span-5 bg-white border border-[#7AAACE]/60 rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon size={14} className="text-[#355872]" />
                1. Choose Date
              </h3>

              {/* Direct Jump to Custom Date & Year */}
              <input
                type="date"
                min={dayjs().format('YYYY-MM-DD')}
                value={dayjs(selectedDate).format('YYYY-MM-DD')}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    setSelectedDate(new Date(year, month - 1, day));
                  }
                }}
                className="text-xs font-bold text-[#355872] bg-[#F7F8F0] border border-[#7AAACE] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#9CD5FF]"
              />
            </div>

            <div className="bg-[#F7F8F0] border border-[#7AAACE]/50 rounded-xl p-3 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                month={selectedDate}
                onMonthChange={setSelectedDate}
                captionLayout="dropdown"
                startMonth={new Date()}
                endMonth={new Date(2035, 11)}
                disabled={(date) => dayjs(date).isBefore(dayjs(), 'day')}
                className="bg-transparent border-0"
              />
            </div>
          </div>

          {/* Time Slot List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} className="text-[#355872]" />
                2. Available Openings on {dayjs(selectedDate).format('MMMM D, YYYY')}
              </h3>
              <span className="text-xs text-[#4A6478] font-semibold">
                {slots.filter((s) => s.available !== false).length} slots open
              </span>
            </div>

            {slotsLoading ? (
              <div className="p-12 text-center text-[#4A6478] bg-white border border-[#7AAACE]/60 rounded-2xl">
                Checking physician calendar...
              </div>
            ) : slots.length === 0 ? (
              <div className="p-12 text-center text-[#4A6478] bg-white border border-[#7AAACE]/60 rounded-2xl space-y-2">
                <AlertCircle size={32} className="mx-auto text-[#7AAACE] opacity-60" />
                <p className="text-sm font-bold text-[#355872]">No open slots for this date.</p>
                <p className="text-xs text-[#4A6478]">Please select another date on the calendar (Mon-Fri 9:00 AM - 5:00 PM).</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {slots.map((slot, idx) => {
                  const slotStart = slot.slotStart || slot.start;
                  const isSelected = (selectedSlot?.slotStart || selectedSlot?.start) === slotStart;
                  const isAvailable = slot.available !== false;
                  return (
                    <button
                      key={idx}
                      disabled={!isAvailable || loading}
                      onClick={() => handleHoldSlot(slot)}
                      className={`p-3.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.97] flex flex-col items-center justify-center gap-1 shadow-sm ${
                        isSelected
                          ? 'bg-[#9CD5FF] border-[#355872] text-[#355872]'
                          : isAvailable
                          ? 'bg-white border-[#7AAACE] text-[#355872] hover:bg-[#9CD5FF]/30 hover:border-[#355872]'
                          : 'bg-[#EEF0E5] border-[#7AAACE]/40 text-[#4A6478]/50 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span className="text-sm">{dayjs(slotStart).format('h:mm A')}</span>
                      <span className="text-[10px] font-semibold">
                        {isAvailable ? 'Reserve Slot' : 'Unavailable'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 1: Describe Symptoms */}
      {step === 1 && (
        <form onSubmit={handleSymptomsSubmit} className="max-w-2xl bg-white border border-[#7AAACE]/60 rounded-2xl p-6 sm:p-8 space-y-6 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#355872]">Pre-Consultation Clinical Intake</h2>
            <p className="text-xs text-[#4A6478]">
              Describe your symptoms, onset, and relevant medical history for physician preparation.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
              Describe your symptoms & chief complaint *
            </label>
            <textarea
              rows={5}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g., Episodic chest tightness and rapid pulse following morning exercise for the past 10 days. No family history of heart disease."
              className="w-full p-4 bg-[#F7F8F0] border border-[#7AAACE] rounded-xl text-sm text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872] focus:ring-2 focus:ring-[#9CD5FF] transition"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#7AAACE]/40">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="px-4 py-2.5 bg-[#F7F8F0] hover:bg-[#EEF0E5] border border-[#7AAACE] rounded-xl text-xs font-bold text-[#355872] transition"
            >
              Back to Calendar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#355872] hover:bg-[#233B4D] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Synthesizing with AI...' : 'Proceed to Review'}
              <ChevronRight size={14} />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: Review & Confirm */}
      {step === 2 && appointment && (
        <div className="max-w-2xl bg-white border border-[#7AAACE]/60 rounded-2xl p-6 sm:p-8 space-y-6 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#355872]">Review & Confirm Consultation</h2>
            <p className="text-xs text-[#4A6478]">
              Verify your booking details and AI symptom summary before final scheduling.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#4A6478] font-semibold">Physician:</span>
              <span className="font-bold text-[#355872]">{doctor?.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#4A6478] font-semibold">Specialisation:</span>
              <span className="font-bold text-[#355872]">{doctor?.specialisation}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#4A6478] font-semibold">Date & Time:</span>
              <span className="font-bold text-[#355872]">
                {dayjs(appointment.slotStart).format('dddd, MMMM D, YYYY · h:mm A')}
              </span>
            </div>
          </div>

          {/* AI Intake Summary */}
          {appointment.symptomForm?.aiSummary && (
            <div className="p-4 rounded-xl bg-[#9CD5FF]/20 border border-[#7AAACE]/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#355872]">
                <Sparkles size={14} className="text-[#355872]" />
                <span>AI Clinical Triage Summary</span>
              </div>
              <p className="text-xs text-[#4A6478] leading-relaxed">
                {typeof appointment.symptomForm.aiSummary === 'string'
                  ? appointment.symptomForm.aiSummary
                  : appointment.symptomForm.aiSummary.chiefComplaint || 'Symptom briefing prepared for physician.'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#7AAACE]/40">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 bg-[#F7F8F0] hover:bg-[#EEF0E5] border border-[#7AAACE] rounded-xl text-xs font-bold text-[#355872] transition"
            >
              Edit Symptoms
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className="px-6 py-2.5 bg-[#355872] hover:bg-[#233B4D] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Confirming...' : 'Confirm Appointment'}
              <CheckCircle2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
