import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  Bell,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Mail,
  Calendar,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminNotifications() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-notifications', statusFilter],
    queryFn: () => adminApi.listNotifications(statusFilter ? { status: statusFilter } : {}).then((r) => r.data),
    refetchInterval: 10000,
  });

  const retryMutation = useMutation({
    mutationFn: (id) => adminApi.retryNotification(id),
    onSuccess: () => {
      toast.success('Notification re-queued in BullMQ');
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Retry failed'),
  });

  const failedCount = notifications.filter((n) => n.status === 'failed').length;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto bg-[#F7F8F0] text-[#355872]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#7AAACE]/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#355872] uppercase tracking-wider mb-1">
            <Bell size={14} className="text-[#355872]" />
            Background Job Reliability
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#355872] tracking-tight font-display">
            Notification Dispatch Queue
          </h1>
          <p className="text-xs sm:text-sm text-[#4A6478] mt-0.5">
            Audit transactional email deliveries, Google Calendar synchronizations, and exponential backoff retry states
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-4 py-2.5 rounded-xl bg-white border border-[#7AAACE]/60 hover:bg-[#EEF0E5] text-xs font-bold text-[#355872] transition flex items-center gap-2 shadow-[0_2px_6px_rgba(53,88,114,0.06)] active:scale-[0.98] shrink-0"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh Pipeline
        </button>
      </div>

      {/* Queue Health Status Banner */}
      {failedCount > 0 ? (
        <div className="p-4 rounded-2xl bg-[#B5533C]/10 border border-[#B5533C]/30 text-[#B5533C] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-lg bg-[#B5533C] text-white flex items-center justify-center shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <span className="font-bold block">{failedCount} Failed Dispatch Item(s)</span>
              <span className="text-[#B5533C]/80">Jobs exceeded max backoff attempts (5 tries). Manual intervention available below.</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#9CD5FF]/30 border border-[#7AAACE] text-[#355872] flex items-center gap-3 text-xs">
          <CheckCircle2 size={18} className="text-[#355872] shrink-0" />
          <span className="font-semibold">Queue operational. All transactional messages dispatched or progressing through healthy backoff intervals.</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { label: 'All Jobs', val: '' },
          { label: 'Failed (Permanent)', val: 'failed' },
          { label: 'Retrying Backoff', val: 'retrying' },
          { label: 'Pending', val: 'pending' },
          { label: 'Sent', val: 'sent' },
        ].map(({ label, val }) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              statusFilter === val
                ? 'bg-[#355872] text-white shadow-[0_4px_12px_rgba(53,88,114,0.15)]'
                : 'bg-white border border-[#7AAACE]/60 text-[#4A6478] hover:text-[#355872] hover:bg-[#EEF0E5]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Audit Table */}
      <div className="bg-white border border-[#7AAACE]/60 rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#7AAACE]/40 bg-[#F7F8F0] hover:bg-[#F7F8F0]">
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider pl-6">Job ID / Status</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider">Channel / Type</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider">Patient / Recipient</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider">Attempts</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider">Error Trace</TableHead>
              <TableHead className="text-[11px] font-bold text-[#355872] uppercase tracking-wider text-right pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[#4A6478]">
                  Polling BullMQ notification workers...
                </TableCell>
              </TableRow>
            ) : notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[#4A6478]">
                  No records matching the selected status filter.
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((n) => (
                <TableRow key={n.id} className="border-b border-[#7AAACE]/20 hover:bg-[#F7F8F0]/70 transition text-xs">
                  <TableCell className="pl-6 py-4">
                    <div className="font-mono text-[#4A6478] text-[11px] mb-1">{n.id.slice(0, 8)}...</div>
                    {n.status === 'sent' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9CD5FF]/50 text-[#355872] border border-[#7AAACE]">
                        Dispatched
                      </span>
                    )}
                    {n.status === 'failed' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B5533C] text-white">
                        Failed
                      </span>
                    )}
                    {n.status === 'retrying' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9A24B] text-white">
                        Retrying Backoff
                      </span>
                    )}
                    {n.status === 'pending' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F7F8F0] text-[#4A6478] border border-[#7AAACE]/60">
                        Queued
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 font-bold text-[#355872] uppercase text-[11px]">
                      {n.channel === 'email' ? <Mail size={13} className="text-[#355872]" /> : <Calendar size={13} className="text-[#355872]" />}
                      {n.channel}
                    </div>
                    <div className="text-[10px] text-[#4A6478] mt-0.5 font-mono">{n.type}</div>
                  </TableCell>

                  <TableCell>
                    <div className="font-bold text-[#355872]">{n.appointment?.patient?.name || 'Patient'}</div>
                    <div className="text-[11px] text-[#4A6478]">{n.appointment?.patient?.email}</div>
                  </TableCell>

                  <TableCell className="font-bold text-[#355872]">
                    {n.attempts} / 5
                  </TableCell>

                  <TableCell className="max-w-[220px] truncate text-[#4A6478]" title={n.lastError || 'None'}>
                    {n.lastError ? (
                      <span className="text-[#B5533C] font-mono text-[11px] font-semibold">{n.lastError}</span>
                    ) : (
                      <span className="text-[#7AAACE]">None</span>
                    )}
                  </TableCell>

                  <TableCell className="pr-6 text-right">
                    {n.status === 'failed' && (
                      <button
                        onClick={() => retryMutation.mutate(n.id)}
                        disabled={retryMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-[#355872] hover:bg-[#233B4D] text-white text-xs font-bold transition active:scale-[0.97] inline-flex items-center gap-1.5 shadow-[0_2px_6px_rgba(53,88,114,0.15)] disabled:opacity-50"
                      >
                        <RotateCcw size={13} />
                        Retry
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
