import { Link } from 'react-router-dom';
import ColorBends from '../components/ColorBends/ColorBends';
import { ArrowRight, ShieldCheck, Stethoscope, Sparkles, UserPlus, LogIn, HeartPulse } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#F7F8F0] flex flex-col justify-between text-[#355872]">
      {/* Autonomous Background ColorBends Animation (Zero Mouse Reactivity, Exact Palette) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <ColorBends
          colors={['#355872', '#7AAACE', '#9CD5FF', '#355872']}
          rotation={45}
          speed={0.25}
          scale={1.1}
          frequency={0.85}
          warpStrength={1.1}
          autoRotate={8}
          noise={0.05}
          iterations={2}
          intensity={1.5}
          bandWidth={5.0}
          transparent={true}
        />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#355872] flex items-center justify-center text-[#9CD5FF] shadow-[0_4px_12px_rgba(53,88,114,0.15)]">
            <HeartPulse size={22} />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-[#355872] font-display block leading-none">
              HMS
            </span>
            <span className="text-[10px] font-bold text-[#4A6478] uppercase tracking-wider">
              Clinical Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl bg-white/90 border border-[#7AAACE]/60 hover:bg-white text-xs font-bold text-[#355872] transition shadow-sm"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-xl bg-[#355872] hover:bg-[#233B4D] text-white text-xs font-bold transition shadow-[0_4px_12px_rgba(53,88,114,0.15)]"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 text-center space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#7AAACE]/60 text-[#355872] text-xs font-bold shadow-sm">
          <Sparkles size={14} className="text-[#7AAACE]" />
          <span>Next-Generation Healthcare Management</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black text-[#355872] tracking-tight font-display leading-[1.1]">
            Intelligent Clinical Care & Appointment Scheduling
          </h1>
          <p className="text-sm sm:text-base text-[#4A6478] max-w-2xl mx-auto leading-relaxed font-medium">
            Seamless scheduling with zero double-booking, AI-assisted intake triage summaries, and automated electronic prescriptions for patients and clinicians.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#355872] hover:bg-[#233B4D] text-white text-sm font-bold transition flex items-center justify-center gap-2 shadow-[0_10px_25px_-3px_rgba(53,88,114,0.25)] active:scale-[0.98]"
          >
            <UserPlus size={18} />
            Get Started — Register as Patient
            <ArrowRight size={16} />
          </Link>

          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/90 border border-[#7AAACE] hover:bg-white text-[#355872] text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
          >
            <LogIn size={18} />
            Provider & Patient Sign In
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10 text-left">
          <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-xs border border-[#7AAACE]/60 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.06)] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 text-[#355872] flex items-center justify-center font-bold">
              <ShieldCheck size={18} />
            </div>
            <h3 className="font-bold text-sm text-[#355872]">Atomic Concurrency</h3>
            <p className="text-xs text-[#4A6478]">
              Sub-second Redis slot holding prevents conflicting bookings during checkout.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-xs border border-[#7AAACE]/60 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.06)] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 text-[#355872] flex items-center justify-center font-bold">
              <Sparkles size={18} />
            </div>
            <h3 className="font-bold text-sm text-[#355872]">AI Clinical Triage</h3>
            <p className="text-xs text-[#4A6478]">
              Automated LLM symptom extraction and pre-visit physician preparation briefs.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-xs border border-[#7AAACE]/60 shadow-[0_4px_20px_-2px_rgba(53,88,114,0.06)] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#F7F8F0] border border-[#7AAACE]/60 text-[#355872] flex items-center justify-center font-bold">
              <Stethoscope size={18} />
            </div>
            <h3 className="font-bold text-sm text-[#355872]">Rostering & Notes</h3>
            <p className="text-xs text-[#4A6478]">
              Interactive calendars, e-prescriptions, and BullMQ transactional notification queue.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 text-center text-xs text-[#4A6478] border-t border-[#7AAACE]/30">
        HMS Healthcare Management Platform · Built for clinical workflows
      </footer>
    </div>
  );
}
