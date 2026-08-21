import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { appointmentsApi } from '../../lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
  XCircle,
  Stethoscope,
  FileText,
  AlertCircle,
  Pill,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

const PAGE_SIZE = 10;

export default function MyAppointments() {
  const qc = useQueryClient();
  const [filterMode, setFilterMode] = useState('all'); // 'upcoming', 'past', 'all'
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const loadMoreSentinelRef = useRef(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.list().then((r) => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => appointmentsApi.cancel(id),
    onSuccess: () => {
      toast.success('Appointment cancelled');
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Cancellation failed'),
  });

  const upcoming = appointments.filter((a) => ['held', 'confirmed'].includes(a.status));
  const past = appointments.filter((a) => ['completed', 'cancelled'].includes(a.status));

  // Determine which list to display
  const targetList = filterMode === 'upcoming' ? upcoming : filterMode === 'past' ? past : appointments;
  const visibleList = targetList.slice(0, visibleLimit);
  const hasMore = visibleLimit < targetList.length;

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [filterMode]);

  // Infinite Scroll / Lazy Loading Sentinel Observer
  useEffect(() => {
    if (!loadMoreSentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleLimit((prev) => Math.min(prev + PAGE_SIZE, targetList.length));
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(loadMoreSentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, targetList.length]);

  return (
    <div className="space-y-8 max-w-5xl bg-[#F7F8F0] text-[#355872]">
      {/* Header */}
      <div className="pb-6 border-b border-[#7AAACE]/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#355872] uppercase tracking-wider">
            Patient History
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#355872] tracking-tight font-display">
            My Appointments & Care Plans
          </h1>
          <p className="text-xs sm:text-sm text-[#4A6478] mt-0.5">
            Review scheduled consultations, access clinical notes, and manage visit history
          </p>
        </div>

        <Link
          to="/patient/search"
          className="px-4 py-2 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-white text-xs font-bold transition active:scale-[0.98] shadow-[0_4px_12px_rgba(53,88,114,0.15)] shrink-0"
        >
          Book New Visit
        </Link>
      </div>

      {/* Filter Mode Switcher */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white border border-[#7AAACE]/60 p-1 rounded-xl shadow-sm text-xs">
          {[
            { label: 'All Encounters', val: 'all', count: appointments.length },
            { label: 'Upcoming', val: 'upcoming', count: upcoming.length },
            { label: 'Past & Completed', val: 'past', count: past.length },
          ].map(({ label, val, count }) => (
            <button
              key={val}
              type="button"
              onClick={() => setFilterMode(val)}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterMode === val
                  ? 'bg-[#355872] text-white shadow-sm'
                  : 'text-[#4A6478] hover:text-[#355872]'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <span className="text-xs font-semibold text-[#4A6478]">
          Showing {visibleList.length} of {targetList.length} records
        </span>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-[#4A6478] bg-white border border-[#7AAACE]/60 rounded-2xl">
          Loading appointment records...
        </div>
      ) : targetList.length === 0 ? (
        <div className="p-12 text-center text-[#4A6478] bg-white border border-[#7AAACE]/60 rounded-2xl space-y-3">
          <CalendarIcon size={36} className="mx-auto text-[#7AAACE] opacity-60" />
          <p className="text-sm font-bold text-[#355872]">No appointments found for this filter.</p>
          <Link
            to="/patient/search"
            className="inline-block px-4 py-2 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-white text-xs font-bold"
          >
            Find a Physician →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {visibleList.map((appt) => {
              const isUpcoming = ['held', 'confirmed'].includes(appt.status);
              return (
                <div
                  key={appt.id}
                  className={`p-5 rounded-2xl bg-white border border-[#7AAACE]/60 hover:border-[#355872] transition-all shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-l-4 ${
                    isUpcoming ? 'border-l-[#355872]' : 'border-l-[#7AAACE]/50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] flex items-center justify-center font-bold">
                      <Stethoscope size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#355872] text-sm">
                          {appt.doctor?.user?.name?.startsWith('Dr.') ? appt.doctor?.user?.name : `Dr. ${appt.doctor?.user?.name || 'Physician'}`}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          appt.status === 'confirmed'
                            ? 'bg-[#9CD5FF] text-[#355872] border border-[#7AAACE]'
                            : appt.status === 'completed'
                            ? 'bg-[#9CD5FF]/40 text-[#355872] border border-[#7AAACE]'
                            : appt.status === 'cancelled'
                            ? 'bg-[#B5533C]/10 text-[#B5533C] border border-[#B5533C]/30'
                            : 'bg-[#F7F8F0] text-[#4A6478] border border-[#7AAACE]/50'
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#4A6478] font-semibold">{appt.doctor?.specialisation}</p>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 sm:text-right text-[#4A6478]">
                    <div className="font-bold text-[#355872]">
                      {dayjs(appt.slotStart).format('ddd, MMM D, YYYY')}
                    </div>
                    <div className="text-[#4A6478] flex items-center sm:justify-end gap-1.5 font-medium">
                      <Clock size={12} className="text-[#7AAACE]" />
                      {dayjs(appt.slotStart).format('h:mm A')} – {dayjs(appt.slotEnd).format('h:mm A')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#7AAACE]/30 shrink-0">
                    <Link
                      to={`/patient/appointments/${appt.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-[#355872] hover:bg-[#233B4D] text-xs font-bold text-white transition"
                    >
                      {appt.status === 'completed' ? 'Remarks' : 'View Details'}
                    </Link>
                    {isUpcoming && (
                      <button
                        onClick={() => {
                          if (confirm('Cancel this scheduled consultation?')) {
                            cancelMutation.mutate(appt.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-[#4A6478] hover:text-[#B5533C] hover:bg-[#B5533C]/10 transition"
                        title="Cancel Appointment"
                      >
                        <XCircle size={17} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lazy Loading Sentinel Element */}
          {hasMore && (
            <div
              ref={loadMoreSentinelRef}
              className="py-4 text-center text-xs text-[#4A6478] flex items-center justify-center gap-2 bg-white/60 rounded-xl border border-[#7AAACE]/40"
            >
              <Loader2 size={15} className="animate-spin text-[#355872]" />
              <span>Loading more appointment history...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
