import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { appointmentsApi, doctorsApi } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import GoogleCalendarButton from '../../components/GoogleCalendarButton';
import dayjs from 'dayjs';
import {
  Calendar as CalendarIcon,
  Clock,
  Search,
  ChevronRight,
  Stethoscope,
  HeartPulse,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PatientDashboard() {
  const { user } = useAuth();

  const { data: appointments = [], isLoading: apptsLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.list().then((r) => r.data),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorsApi.search().then((r) => r.data),
  });

  const upcoming = appointments.filter((a) => ['held', 'confirmed'].includes(a.status));
  const nextAppt = upcoming[0];

  return (
    <div className="space-y-8 w-full bg-[#F7F8F0] text-[#355872]">
      {/* Welcome Banner — Solid Ink & Paper Card */}
      <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border border-[#7AAACE]/60 shadow-[0_2px_12px_-2px_rgba(53,88,114,0.06)] space-y-3 sm:space-y-4">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#9CD5FF]/30 border border-[#7AAACE]/60 text-[#355872] text-[11px] sm:text-xs font-bold">
            <Sparkles size={12} className="text-[#355872]" />
            Personal Health Portal
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-[#355872] tracking-tight font-display">
            Welcome, {user?.name || 'Patient'}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A6478] max-w-xl leading-relaxed">
            Schedule consultations with board-certified physicians, review clinical remarks, and track your active appointments.
          </p>

          <div className="pt-2 flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <Link
              to="/patient/search"
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#355872] hover:bg-[#233B4D] active:scale-[0.98] text-white text-xs font-bold transition shadow-xs"
            >
              <Search size={14} />
              Find a Physician
            </Link>

            <GoogleCalendarButton />
          </div>
        </div>
      </div>

      {/* Next Appointment Card / Skeleton */}
      {apptsLoading ? (
        <div className="p-6 rounded-3xl bg-white border border-[#7AAACE]/60 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-36 bg-[#7AAACE]/20" />
            <Skeleton className="h-4 w-20 rounded-full bg-[#7AAACE]/20" />
          </div>
          <div className="p-4 rounded-2xl bg-[#F7F8F0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-2xl bg-[#7AAACE]/20" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 bg-[#7AAACE]/20" />
                <Skeleton className="h-3 w-28 bg-[#7AAACE]/20" />
              </div>
            </div>
            <Skeleton className="h-8 w-28 bg-[#7AAACE]/20" />
          </div>
        </div>
      ) : nextAppt && (
        <div className="p-6 rounded-3xl bg-white border border-[#7AAACE]/60 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] space-y-4 border-l-4 border-l-[#355872]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#355872] flex items-center gap-2">
              <CalendarIcon size={15} className="text-[#7AAACE]" />
              Upcoming
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9CD5FF] text-[#355872] border border-[#7AAACE] uppercase">
              {nextAppt.status}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-[#F7F8F0] border border-[#7AAACE]/50">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#355872] flex items-center justify-center text-white font-bold shadow-[0_4px_12px_rgba(53,88,114,0.15)]">
                <Stethoscope size={22} className="text-[#9CD5FF]" />
              </div>
              <div>
                <h3 className="font-bold text-[#355872] text-base">
                  Dr. {nextAppt.doctor?.user?.name}
                </h3>
                <p className="text-xs text-[#4A6478] font-semibold">
                  {nextAppt.doctor?.specialisation}
                </p>
              </div>
            </div>

            <div className="text-xs space-y-1 sm:text-right text-[#4A6478]">
              <div className="font-bold text-[#355872]">
                {dayjs(nextAppt.slotStart).format('dddd, MMMM D, YYYY')}
              </div>
              <div className="flex items-center sm:justify-end gap-1.5 font-medium">
                <Clock size={13} className="text-[#7AAACE]" />
                {dayjs(nextAppt.slotStart).format('h:mm A')} – {dayjs(nextAppt.slotEnd).format('h:mm A')}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Link
              to={`/patient/appointments/${nextAppt.id}`}
              className="text-xs font-bold text-[#355872] hover:underline flex items-center gap-1 transition"
            >
              View Full Details & AI Summary
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      )}

      {/* Featured Physicians Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#355872] tracking-tight font-display">
              Available Clinical Specialists
            </h2>
            <p className="text-xs text-[#4A6478]">Book direct consultations with attending specialists</p>
          </div>

          <Link
            to="/patient/search"
            className="text-xs font-bold text-[#355872] hover:underline flex items-center gap-1"
          >
            View All ({doctors.length})
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {doctors.slice(0, 4).map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-white border border-[#7AAACE]/60 hover:border-[#355872] transition shadow-[0_4px_20px_-2px_rgba(53,88,114,0.06)] flex flex-col justify-between space-y-4 border-l-4 border-l-[#7AAACE]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 text-[#355872] flex items-center justify-center font-bold text-sm">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#355872] text-sm">{doc.name}</h3>
                    <p className="text-xs font-semibold text-[#4A6478]">{doc.specialisation}</p>
                  </div>
                </div>

                <span className="text-[10px] text-[#4A6478] font-bold px-2 py-0.5 rounded-full bg-[#F7F8F0] border border-[#7AAACE]/50">
                  {doc.slotDuration}m slots
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#7AAACE]/30 text-xs">
                <span className="text-[#4A6478] font-medium">Standard Consultations</span>
                <Link
                  to={`/patient/book/${doc.id}`}
                  className="px-3.5 py-1.5 rounded-lg bg-[#355872] hover:bg-[#233B4D] text-white font-bold text-xs transition active:scale-[0.97]"
                >
                  Book Slot
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
