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
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', doctorId, formattedDate],
    queryFn: () => doctorsApi.getSlots(doctorId, formattedDate).then((r) => r.data),
    enabled: !!doctorId && !!formattedDate,
  });

  const handleHoldSlot = async (slot) => {
    setSelectedSlot(slot);
    setLoading(true);
    try {
      const res = await appointmentsApi.hold({
        doctorId,
        slotStart: slot.start,
        slotEnd: slot.end,
      });
      setAppointment(res.data.appointment);
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
      setAppointment(res.data.appointment);
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
    <div className="space-y-8 max-w-4xl bg-[#F7F8F0] text-[#355872]">
      {/* Wayfinding Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList className="text-xs text-[#4A6478]">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/patient" className="hover:text-[#355872]">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/patient/search" className="hover:text-[#355872]">Specialists</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[#355872] font-bold">
              Dr. {doctor?.name || 'Physician'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="pb-6 border-b border-[#7AAACE]/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#355872] uppercase tracking-wider">
            Consultation Intake
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#355872] tracking-tight font-display">
            Book Appointment with Dr. {doctor?.name}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A6478] mt-0.5">
            {doctor?.specialisation} · {doctor?.slotDuration} Minute Clinical Consultation
          </p>
        </div>

        {/* Step Indicator Pills */}
        <div className="flex items-center gap-1.5 bg-white border border-[#7AAACE]/60 p-1.5 rounded-2xl shrink-0 shadow-[0_2px_6px_rgba(53,88,114,0.06)]">
          {STEPS.map((label, idx) => (
            <div
              key={idx}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                step === idx
                  ? 'bg-[#355872] text-white shadow-sm'
                  : step > idx
                  ? 'bg-[#9CD5FF] text-[#355872]'
                  : 'text-[#4A6478]'
              }`}
            >
              {idx + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Hold Expiry Alert Banner for Steps 1 & 2 */}
      {appointment?.expiresAt && step > 0 && (
        <Alert className="bg-white border-[#D9A24B] text-[#355872] shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <Clock className="h-4 w-4 text-[#D9A24B]" />
          <AlertTitle className="text-xs font-bold text-[#D9A24B] uppercase tracking-wider">
            Slot Reserved For 5 Minutes
          </AlertTitle>
          <AlertDescription className="text-xs text-[#4A6478]">
            Please complete intake information before the hold expires at{' '}
            <strong className="text-[#355872]">{dayjs(appointment.expiresAt).format('h:mm:ss A')}</strong>.
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
                {slots.filter((s) => s.available).length} slots open
              </span>
            </div>

            {slotsLoading ? (
              <div className="p-12 text-center text-[#4A6478] bg-white border border-[#7AAACE]/60 rounded-2xl">
                Checking physician calendar...
              </div>
            ) : slots.length === 0 ? (
              <div className="p-12 text-center text-[#4A6478] bg-white border border-[#7AAACE]/60 rounded-2xl space-y-2">
                <AlertCircle size={32} className="mx-auto text-[#7AAACE] opacity-60" />
                <p className="text-sm font-bold text-[#355872]">Physician not on duty or all slots booked for this date.</p>
                <p className="text-xs text-[#4A6478]">Please select another date on the calendar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {slots.map((slot, idx) => {
                  const isSelected = selectedSlot?.start === slot.start;
                  return (
                    <button
                      key={idx}
                      disabled={!slot.available || loading}
                      onClick={() => handleHoldSlot(slot)}
                      className={`p-3.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.97] flex flex-col items-center justify-center gap-1 shadow-sm ${
                        isSelected
                          ? 'bg-[#9CD5FF] border-[#355872] text-[#355872]'
                          : slot.available
                          ? 'bg-white border-[#7AAACE] text-[#355872] hover:bg-[#9CD5FF]/30 hover:border-[#355872]'
                          : 'bg-[#EEF0E5] border-[#7AAACE]/40 text-[#4A6478]/50 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span className="text-sm">{dayjs(slot.start).format('h:mm A')}</span>
                      <span className="text-[10px] font-semibold">
                        {slot.available ? 'Reserve Slot' : 'Unavailable'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 1: Symptoms Form */}
      {step === 1 && (
        <form onSubmit={handleSymptomsSubmit} className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#7AAACE]/60 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-[#355872] font-display">
                Describe Your Current Symptoms & Concerns
              </h2>
              <p className="text-xs sm:text-sm text-[#4A6478] leading-relaxed">
                Provide detail about your symptoms, when they began, severity, and any medications you are taking. Our clinical intake engine will synthesize this for Dr. {doctor?.name}.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#9CD5FF]/20 border border-[#7AAACE] text-xs text-[#355872] flex items-center gap-3">
              <Sparkles size={16} className="text-[#355872] shrink-0" />
              <span className="font-semibold">AI analysis will automatically extract chief complaints and provide pre-visit questions to your physician.</span>
            </div>

            <textarea
              rows={6}
              className="w-full p-4 rounded-2xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872] focus:ring-2 focus:ring-[#9CD5FF] text-sm leading-relaxed font-medium"
              placeholder="e.g. Mild chest tightness that started 3 days ago after exercise. No fever, but occasional shortness of breath when walking up stairs. Currently taking 20mg Omeprazole..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              required
            />

            <div className="flex items-center justify-between pt-4 border-t border-[#7AAACE]/40">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-4 py-2.5 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 text-[#355872] text-xs font-bold hover:bg-[#EEF0E5] transition"
              >
                Back to Slots
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-white text-xs font-bold transition flex items-center gap-2 shadow-[0_4px_12px_rgba(53,88,114,0.15)] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Processing Intake...' : 'Review & Confirm'}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 2: Review & Confirm */}
      {step === 2 && appointment && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#7AAACE]/60 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] space-y-6">
            <h2 className="text-lg font-bold text-[#355872] font-display">
              Confirm Consultation Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-[#F7F8F0] border border-[#7AAACE]/60 text-xs">
              <div>
                <span className="text-[#4A6478] font-bold block uppercase tracking-wider text-[10px]">Physician</span>
                <span className="text-[#355872] font-bold text-sm mt-0.5 block">Dr. {doctor?.name}</span>
                <span className="text-[#4A6478] font-semibold">{doctor?.specialisation}</span>
              </div>

              <div>
                <span className="text-[#4A6478] font-bold block uppercase tracking-wider text-[10px]">Date & Time</span>
                <span className="text-[#355872] font-bold text-sm mt-0.5 block">
                  {dayjs(appointment.slotStart).format('dddd, MMMM D, YYYY')}
                </span>
                <span className="text-[#4A6478] font-medium">
                  {dayjs(appointment.slotStart).format('h:mm A')} – {dayjs(appointment.slotEnd).format('h:mm A')}
                </span>
              </div>
            </div>

            {/* AI Summary Preview */}
            {appointment.symptomForm?.aiSummary && (
              <div className="p-5 rounded-2xl bg-[#F7F8F0] border border-[#7AAACE] text-xs space-y-3">
                <div className="flex items-center justify-between text-[#355872] font-bold uppercase tracking-wider text-[11px]">
                  <span className="flex items-center gap-1.5"><Sparkles size={13} className="text-[#7AAACE]" /> AI Clinical Triage Synthesis</span>
                  {appointment.symptomForm.aiSummary.urgency === 'High' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#B5533C] text-white font-bold">
                      High Urgency
                    </span>
                  )}
                  {appointment.symptomForm.aiSummary.urgency === 'Medium' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#D9A24B] text-white font-bold">
                      Medium Urgency
                    </span>
                  )}
                  {appointment.symptomForm.aiSummary.urgency === 'Low' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#9CD5FF] text-[#355872] font-bold">
                      Low Urgency
                    </span>
                  )}
                </div>

                <div>
                  <strong className="text-[#355872] block mb-0.5">Chief Complaint:</strong>
                  <p className="text-[#4A6478]">{appointment.symptomForm.aiSummary.chiefComplaint}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-[#7AAACE]/40">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 text-[#355872] text-xs font-bold hover:bg-[#EEF0E5] transition"
              >
                Edit Symptoms
              </button>

              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-white text-xs font-bold transition flex items-center gap-2 shadow-[0_4px_12px_rgba(53,88,114,0.2)] active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {loading ? 'Confirming...' : 'Confirm Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
