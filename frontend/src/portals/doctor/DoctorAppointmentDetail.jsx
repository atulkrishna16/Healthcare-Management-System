import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '../../lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  ChevronLeft,
  Clock,
  User,
  Brain,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Pill,
  Calendar,
} from 'lucide-react';

export default function DoctorAppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState([]);
  const [newRx, setNewRx] = useState({ medication: '', dosage: '', frequency: 'once daily', durationDays: 7 });

  const { data: appt, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentsApi.get(id).then((r) => r.data),
    onSuccess: (data) => {
      if (data.visitNote) {
        setNotes(data.visitNote.notes || '');
        setPrescription(data.visitNote.prescription || []);
      }
    },
  });

  const notesMutation = useMutation({
    mutationFn: (payload) => appointmentsApi.submitNotes(id, payload),
    onSuccess: () => {
      toast.success('Clinical visit notes recorded and sent to patient');
      qc.invalidateQueries({ queryKey: ['appointment', id] });
      qc.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to submit visit notes'),
  });

  const addRx = () => {
    if (!newRx.medication.trim() || !newRx.dosage.trim()) {
      return toast.error('Please specify medication name and dosage');
    }
    setPrescription([...prescription, { ...newRx, durationDays: Number(newRx.durationDays) }]);
    setNewRx({ medication: '', dosage: '', frequency: 'once daily', durationDays: 7 });
  };

  const removeRx = (index) => {
    setPrescription(prescription.filter((_, i) => i !== index));
  };

  const handleSubmitNotes = (e) => {
    e.preventDefault();
    if (!notes.trim()) return toast.error('Please write clinical notes before submitting');
    notesMutation.mutate({ notes, prescription });
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-[#4A6478]">
        Loading patient visit details...
      </div>
    );
  }

  if (!appt) {
    return (
      <div className="p-12 text-center text-[#4A6478] space-y-3">
        <p>Appointment record not found.</p>
        <Link to="/doctor" className="text-[#355872] font-bold hover:underline text-xs">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const aiSummary = appt.symptomForm?.aiSummary;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto bg-[#F7F8F0] text-[#355872]">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-[#7AAACE]/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/doctor')}
            className="w-9 h-9 rounded-xl bg-white border border-[#7AAACE]/60 flex items-center justify-center text-[#355872] hover:bg-[#EEF0E5] transition"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#355872] font-display tracking-tight">
              Clinical Encounter Record
            </h1>
            <p className="text-xs text-[#4A6478]">
              ID: {appt.id.slice(0, 8)}... · Status: <span className="uppercase text-[#355872] font-bold">{appt.status}</span>
            </p>
          </div>
        </div>

        {appt.status === 'completed' && (
          <div className="px-3 py-1 rounded-full bg-[#9CD5FF]/40 border border-[#7AAACE] text-[#355872] text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            Visit Completed
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Patient Info & AI Assessment */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Patient Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#7AAACE]/60 space-y-4 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] flex items-center justify-center font-bold">
                <User size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[#355872] truncate">{appt.patient?.name}</h3>
                <p className="text-xs text-[#4A6478] truncate">{appt.patient?.email}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#7AAACE]/40 text-xs space-y-2 text-[#4A6478]">
              <div className="flex items-center justify-between">
                <span>Date</span>
                <span className="font-bold text-[#355872]">{dayjs(appt.slotStart).format('MMM D, YYYY')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Time</span>
                <span className="font-bold text-[#355872]">{dayjs(appt.slotStart).format('h:mm A')} – {dayjs(appt.slotEnd).format('h:mm A')}</span>
              </div>
            </div>
          </div>

          {/* AI Symptom Assessment */}
          <div className="p-5 rounded-2xl bg-white border border-[#7AAACE]/60 space-y-4 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#355872] text-xs font-bold uppercase tracking-wider">
                <Brain size={15} className="text-[#7AAACE]" />
                AI Pre-Visit Intake
              </div>
              {aiSummary?.urgency === 'High' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B5533C] text-white">
                  High
                </span>
              )}
              {aiSummary?.urgency === 'Medium' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9A24B] text-white">
                  Medium
                </span>
              )}
              {aiSummary?.urgency === 'Low' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9CD5FF] text-[#355872]">
                  Low
                </span>
              )}
            </div>

            {aiSummary ? (
              <div className="space-y-3 text-xs text-[#355872]">
                <div>
                  <span className="text-[#4A6478] font-bold block text-[10px] uppercase tracking-wider">
                    Chief Complaint
                  </span>
                  <p className="mt-0.5 text-[#355872] leading-relaxed font-semibold">
                    {aiSummary.chiefComplaint}
                  </p>
                </div>

                {aiSummary.suggestedQuestions?.length > 0 && (
                  <div>
                    <span className="text-[#4A6478] font-bold block text-[10px] uppercase tracking-wider mb-1">
                      Suggested Clinical Inquiries
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-[#4A6478]">
                      {aiSummary.suggestedQuestions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : appt.symptomForm?.symptoms ? (
              <div className="text-xs text-[#355872]">
                <span className="text-[#4A6478] font-bold block text-[10px] uppercase tracking-wider mb-1">
                  Reported Symptoms
                </span>
                <p className="leading-relaxed text-[#4A6478]">{appt.symptomForm.symptoms}</p>
              </div>
            ) : (
              <p className="text-xs text-[#4A6478]">No symptoms reported by patient prior to visit.</p>
            )}
          </div>

        </div>

        {/* Right Column: Clinical Notes & Prescription Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmitNotes} className="space-y-6">
            
            {/* Clinical Encounter Notes */}
            <div className="p-6 rounded-2xl bg-white border border-[#7AAACE]/60 space-y-3 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
              <label className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
                <FileText size={15} className="text-[#355872]" />
                Clinical Notes & Assessment
              </label>
              <textarea
                rows={5}
                className="w-full p-4 rounded-xl bg-[#F7F8F0] border border-[#7AAACE] text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872] focus:ring-2 focus:ring-[#9CD5FF] text-sm leading-relaxed font-medium"
                placeholder="Document patient physical findings, diagnosis, plan of care, and treatment instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              />
            </div>

            {/* Prescription Builder */}
            <div className="p-6 rounded-2xl bg-white border border-[#7AAACE]/60 space-y-4 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.08)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#355872] uppercase tracking-wider flex items-center gap-2">
                  <Pill size={15} className="text-[#355872]" />
                  Prescription Orders
                </label>
                <span className="text-xs text-[#4A6478] font-medium">
                  {prescription.length} medication{prescription.length !== 1 ? 's' : ''} added
                </span>
              </div>

              {/* Added Meds List */}
              {prescription.length > 0 && (
                <div className="space-y-2">
                  {prescription.map((rx, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-[#355872] text-white flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-[#355872]">{rx.medication}</span>{' '}
                          <span className="text-[#4A6478]">({rx.dosage})</span>
                          <div className="text-[#4A6478] text-[11px] mt-0.5">
                            {rx.frequency} · {rx.durationDays} days
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeRx(idx)}
                        className="text-[#4A6478] hover:text-[#B5533C] p-1 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Med Form */}
              <div className="p-4 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    className="p-2.5 rounded-lg bg-white border border-[#7AAACE] text-xs text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872]"
                    placeholder="Medication (e.g. Amoxicillin)"
                    value={newRx.medication}
                    onChange={(e) => setNewRx({ ...newRx, medication: e.target.value })}
                  />
                  <input
                    type="text"
                    className="p-2.5 rounded-lg bg-white border border-[#7AAACE] text-xs text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872]"
                    placeholder="Dosage (e.g. 500mg)"
                    value={newRx.dosage}
                    onChange={(e) => setNewRx({ ...newRx, dosage: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    className="p-2.5 rounded-lg bg-white border border-[#7AAACE] text-xs text-[#355872] focus:outline-none focus:border-[#355872]"
                    value={newRx.frequency}
                    onChange={(e) => setNewRx({ ...newRx, frequency: e.target.value })}
                  >
                    <option value="once daily">Once daily (8am)</option>
                    <option value="twice daily">Twice daily (8am, 8pm)</option>
                    <option value="three times daily">Three times daily (8am, 2pm, 8pm)</option>
                    <option value="four times daily">Four times daily (every 6h)</option>
                    <option value="before meals">Before meals (3x daily)</option>
                    <option value="after meals">After meals (3x daily)</option>
                    <option value="at bedtime">At bedtime (9pm)</option>
                    <option value="weekly">Once weekly</option>
                  </select>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      className="w-24 p-2.5 rounded-lg bg-white border border-[#7AAACE] text-xs text-[#355872] focus:outline-none focus:border-[#355872]"
                      placeholder="Days"
                      value={newRx.durationDays}
                      onChange={(e) => setNewRx({ ...newRx, durationDays: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={addRx}
                      className="flex-1 px-3 py-2.5 rounded-lg bg-[#355872] hover:bg-[#233B4D] text-xs font-bold text-white flex items-center justify-center gap-1.5 transition active:scale-[0.97]"
                    >
                      <Plus size={14} />
                      Add Drug
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Submit Action */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={notesMutation.isPending}
                className="px-6 py-3 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-xs font-bold text-white transition flex items-center gap-2 shadow-[0_4px_12px_rgba(53,88,114,0.15)] active:scale-[0.98] disabled:opacity-50"
              >
                <Send size={14} />
                {notesMutation.isPending ? 'Processing Summary...' : 'Finalize & Send Patient Summary'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
