import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { googleCalendarApi } from '../lib/api';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle2, Loader2, Unlink } from 'lucide-react';

export default function GoogleCalendarButton() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: statusData } = useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: () => googleCalendarApi.getStatus().then((r) => r.data),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_calendar_linked') === 'true') {
      toast.success('Google Calendar linked successfully! All bookings will sync automatically.');
      queryClient.invalidateQueries(['google-calendar-status']);
      // Clean query param
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [queryClient]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await googleCalendarApi.getConnectUrl();
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          'Google Calendar OAuth is not configured on the server yet. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env'
      );
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Google Calendar sync?')) return;
    setLoading(true);
    try {
      await googleCalendarApi.disconnect();
      toast.success('Google Calendar disconnected');
      queryClient.invalidateQueries(['google-calendar-status']);
    } catch (err) {
      toast.error('Failed to disconnect Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const isConnected = statusData?.isConnected;

  if (isConnected) {
    return (
      <button
        onClick={handleDisconnect}
        disabled={loading}
        title="Click to disconnect Google Calendar"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9CD5FF]/30 border border-[#7AAACE] text-xs font-bold text-[#355872] hover:bg-[#B5533C]/10 hover:text-[#B5533C] hover:border-[#B5533C]/40 transition group shadow-xs"
      >
        <CheckCircle2 size={14} className="text-[#355872] group-hover:hidden" />
        <Unlink size={14} className="hidden group-hover:inline text-[#B5533C]" />
        <span className="group-hover:hidden">Google Calendar Synced</span>
        <span className="hidden group-hover:inline">Disconnect Calendar</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#7AAACE] hover:bg-[#9CD5FF]/20 text-[#355872] text-xs font-bold transition shadow-xs active:scale-[0.98] disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin text-[#355872]" />
      ) : (
        <Calendar size={14} className="text-[#355872]" />
      )}
      Sync with Google Calendar
    </button>
  );
}
