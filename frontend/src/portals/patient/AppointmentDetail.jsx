import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi } from '../../lib/api';
import dayjs from 'dayjs';
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  Stethoscope,
  Sparkles,
  Pill,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: appt, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentsApi.get(id).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-[#4A6478] bg-white border border-[#7AAACE]/60 rounded-2xl">
        Loading clinical record...
      </div>
    );
  }

  if (!appt) {
    return (
      <div className="p-12 text-center text-[#4A6478] space-y-3">
        <p>Encounter record not found.</p>
        <Link to="/patient/appointments" className="text-[#355872] font-bold hover:underline text-xs">
          Return to My Appointments
        </Link>
      </div>
    );
  }

  const aiSummary = appt.symptomForm?.aiSummary;
  const visitNote = appt.visitNote;

  return (
    <div className="space-y-8 max-w-4xl bg-[#F7F8F0] text-[#355872]">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-[#7AAACE]/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/patient/appointments')}
            className="w-9 h-9 rounded-xl bg-white border border-[#7AAACE]/60 flex items-center justify-center text-[#355872] hover:bg-[#EEF0E5] transition"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#355872] font-display tracking-tight">
              Consultation Details
            </h1>
            <p className="text-xs text-[#4A6478]">
              Dr. {appt.doctor?.user?.name} · {dayjs(appt.slotStart).format('MMMM D, YYYY')}
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          appt.status === 'completed'
            ? 'bg-[#9CD5FF] text-[#355872] border border-[#7AAACE]'
            : 'bg-[#9CD5FF]/40 text-[#355872] border border-[#7AAACE]'
        }`}>
          {appt.status}
        </span>
      </div>

      {/* Primary Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Physician Info */}
        <div className="p-5 rounded-2xl bg-white border border-[#7AAACE]/60 space-y-3 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6478] block">
            Attending Physician
          </span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] flex items-center justify-center font-bold">
              <Stethoscope size={18} />
            </div>
            <div>
              <h3 className="font-bold text-[#355872] text-sm">Dr. {appt.doctor?.user?.name}</h3>
              <p className="text-xs text-[#4A6478] font-semibold">{appt.doctor?.specialisation}</p>
            </div>
          </div>
        </div>

        {/* Slot Window */}
        <div className="p-5 rounded-2xl bg-white border border-[#7AAACE]/60 space-y-2 text-xs shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A6478] block">
            Appointment Time
          </span>
          <div className="font-bold text-[#355872] text-sm">
            {dayjs(appt.slotStart).format('dddd, MMMM D, YYYY')}
          </div>
          <div className="text-[#4A6478] flex items-center gap-1.5 font-medium">
            <Clock size={13} className="text-[#7AAACE]" />
            {dayjs(appt.slotStart).format('h:mm A')} – {dayjs(appt.slotEnd).format('h:mm A')} ({appt.doctor?.timezone || 'EST'})
          </div>
        </div>
      </div>

      {/* AI Pre-Visit Triage Summary */}
      {aiSummary && (
        <div className="p-6 rounded-3xl bg-white border border-[#7AAACE]/60 space-y-4 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#355872] text-xs font-bold uppercase tracking-wider">
              <Sparkles size={15} className="text-[#7AAACE]" />
              AI Clinical Intake Synthesis
            </div>
            {aiSummary.urgency === 'High' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B5533C] text-white">
                High Urgency
              </span>
            )}
            {aiSummary.urgency === 'Medium' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9A24B] text-white">
                Medium Urgency
              </span>
            )}
            {aiSummary.urgency === 'Low' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9CD5FF] text-[#355872]">
                Low Urgency
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs text-[#355872]">
            <strong className="text-[#355872] block">Chief Complaint Summary:</strong>
            <p className="leading-relaxed text-[#4A6478] font-medium">{aiSummary.chiefComplaint}</p>
          </div>
        </div>
      )}

      {/* Doctor's Post-Visit Notes & Prescription */}
      {visitNote ? (
        <div className="space-y-6">
          {/* Clinical Notes */}
          <div className="p-6 rounded-3xl bg-white border border-[#7AAACE]/60 space-y-3 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
            <h3 className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
              <FileText size={15} className="text-[#355872]" />
              Doctor's Clinical Notes & Care Plan
            </h3>
            <p className="text-xs sm:text-sm text-[#355872] leading-relaxed p-4 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/50 font-medium">
              {visitNote.notes}
            </p>
          </div>

          {/* Electronic Prescription */}
          {visitNote.prescription?.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-[#7AAACE]/60 space-y-4 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
              <h3 className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
                <Pill size={15} className="text-[#355872]" />
                Prescribed Medications ({visitNote.prescription.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visitNote.prescription.map((rx, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#355872] text-sm">{rx.medication}</span>
                      <span className="text-[#355872] font-bold">{rx.dosage}</span>
                    </div>
                    <div className="text-[#4A6478]">{rx.frequency}</div>
                    <div className="text-[11px] text-[#4A6478]">Duration: {rx.durationDays} Days</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-white border border-[#7AAACE]/60 text-xs text-[#4A6478] flex items-center gap-2 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.06)]">
          <AlertCircle size={15} className="text-[#7AAACE]" />
          Visit notes and prescriptions will be published here after your consultation with Dr. {appt.doctor?.user?.name}.
        </div>
      )}
    </div>
  );
}
