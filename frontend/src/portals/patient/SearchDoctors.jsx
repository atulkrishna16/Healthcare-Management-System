import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { doctorsApi } from '../../lib/api';
import { Search, Stethoscope, Clock, ChevronRight, User, CalendarDays } from 'lucide-react';

const SPECIALISATIONS = [
  'All',
  'Cardiology',
  'Neurology',
  'General Practice',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SearchDoctors() {
  const [selectedSpec, setSelectedSpec] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors', selectedSpec],
    queryFn: () =>
      doctorsApi
        .search(selectedSpec === 'All' ? undefined : selectedSpec)
        .then((r) => r.data),
  });

  const filtered = doctors.filter((doc) =>
    searchQuery
      ? doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialisation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.email?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="space-y-8 max-w-5xl bg-[#F7F8F0] text-[#355872]">
      {/* Header */}
      <div className="pb-6 border-b border-[#7AAACE]/40 space-y-1">
        <div className="text-xs font-bold text-[#355872] uppercase tracking-wider">
          Provider Network
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#355872] tracking-tight font-display">
          Find a Specialist
        </h1>
        <p className="text-xs sm:text-sm text-[#4A6478]">
          Browse verified physicians, check consultation durations, and book real-time available appointments
        </p>
      </div>

      {/* Search Input & Filter Pills */}
      <div className="space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7AAACE]" />
          <input
            type="text"
            placeholder="Search by physician name, specialty, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-[#7AAACE] text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872] focus:ring-2 focus:ring-[#9CD5FF] text-sm shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] font-medium"
          />
        </div>

        {/* Specialty Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {SPECIALISATIONS.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpec(spec)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedSpec === spec
                  ? 'bg-[#355872] text-white shadow-[0_2px_8px_rgba(53,88,114,0.2)]'
                  : 'bg-white border border-[#7AAACE]/60 text-[#4A6478] hover:text-[#355872] hover:bg-[#EEF0E5]'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-[#4A6478] bg-white border border-[#7AAACE]/60 rounded-2xl">
          Loading provider registry...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-[#4A6478] bg-white border border-[#7AAACE]/60 rounded-2xl space-y-2">
          <Stethoscope size={32} className="mx-auto text-[#7AAACE] opacity-60" />
          <p className="text-sm font-bold text-[#355872]">No physicians matched your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((doc) => {
            const activeDays = (doc.workingHours || [])
              .map((h) => DAY_NAMES[h.dayOfWeek])
              .join(', ');

            return (
              <div
                key={doc.id}
                className="p-6 rounded-2xl bg-white border border-[#7AAACE]/60 hover:border-[#355872] transition-all shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)] flex flex-col justify-between space-y-5 border-l-4 border-l-[#7AAACE]"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 text-[#355872] flex items-center justify-center font-bold">
                        <User size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#355872] text-base">{doc.name}</h3>
                        <p className="text-xs font-semibold text-[#4A6478]">{doc.specialisation}</p>
                        {doc.email && (
                          <p className="text-[11px] text-[#7AAACE] font-medium">{doc.email}</p>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-[#4A6478] font-bold px-2.5 py-1 rounded-full bg-[#F7F8F0] border border-[#7AAACE]/50 shrink-0">
                      {doc.slotDuration}m slots
                    </span>
                  </div>

                  {activeDays && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#355872] font-semibold bg-[#F7F8F0] p-2 rounded-xl border border-[#7AAACE]/40">
                      <CalendarDays size={13} className="text-[#355872]" />
                      <span>Shifts: {activeDays}</span>
                    </div>
                  )}

                  {doc.bio && (
                    <p className="text-xs text-[#4A6478] line-clamp-2 leading-relaxed">
                      {doc.bio}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#7AAACE]/30 text-xs">
                  <span className="text-[#4A6478] font-medium">{doc.timezone || 'EST'}</span>
                  <Link
                    to={`/patient/book/${doc.id}`}
                    className="px-4 py-2 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-white font-bold text-xs transition active:scale-[0.97] flex items-center gap-1 shadow-[0_4px_12px_rgba(53,88,114,0.15)]"
                  >
                    Schedule Visit
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
