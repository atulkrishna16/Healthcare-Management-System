import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';

/**
 * SimplePagination — shared pagination control used across all portal pages.
 * Replaces 30+ lines of duplicated Pagination markup in MyAppointments,
 * SearchDoctors, AdminDoctors, and DoctorDashboard.
 */
export default function SimplePagination({ page, total, onChange }) {
  if (total <= 1) return null;
  return (
    <div className="pt-4 flex justify-center">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <button
              onClick={() => onChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-[#7AAACE]/50 text-xs font-bold text-[#355872] hover:bg-white disabled:opacity-40 transition"
            >
              Previous
            </button>
          </PaginationItem>

          {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
            <PaginationItem key={n}>
              <button
                onClick={() => onChange(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                  page === n
                    ? 'bg-[#355872] text-white shadow-xs'
                    : 'bg-white border border-[#7AAACE]/50 text-[#355872] hover:bg-[#F7F8F0]'
                }`}
              >
                {n}
              </button>
            </PaginationItem>
          ))}

          <PaginationItem>
            <button
              onClick={() => onChange(Math.min(total, page + 1))}
              disabled={page === total}
              className="px-3 py-1.5 rounded-lg border border-[#7AAACE]/50 text-xs font-bold text-[#355872] hover:bg-white disabled:opacity-40 transition"
            >
              Next
            </button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
