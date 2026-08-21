import { Link } from 'react-router-dom';
import ColorBends from '../components/ColorBends/ColorBends';
import { ArrowLeft, Home, Search, HeartPulse, HelpCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#F7F8F0] flex flex-col justify-between text-[#355872]">
      {/* Background ColorBends Animation matching Landing Page */}
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
        <Link to="/" className="flex items-center gap-3">
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
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 border border-[#7AAACE]/60 hover:bg-white text-xs font-bold text-[#355872] transition shadow-sm"
        >
          <Home size={14} />
          Home
        </Link>
      </header>

      {/* 404 Hero Card */}
      <main className="relative z-10 max-w-lg mx-auto px-6 py-12 text-center space-y-6 my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#7AAACE]/60 text-[#355872] text-xs font-bold shadow-sm">
          <HelpCircle size={14} className="text-[#355872]" />
          <span>Error 404 · Page Not Found</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl sm:text-6xl font-black text-[#355872] tracking-tight font-display">
            Oh noo....
          </h1>
          <p className="text-sm sm:text-base text-[#4A6478] font-medium leading-relaxed">
            The page you are looking for might have been moved, rescheduled, or doesn't exist in our clinical registry.
          </p>
        </div>

        {/* Quick Action Navigation Card */}
        <div className="p-6 rounded-3xl bg-white/95 border border-[#7AAACE]/60 shadow-[0_12px_36px_rgba(53,88,114,0.1)] space-y-3">
          <Link
            to="/"
            className="w-full py-3 bg-[#355872] hover:bg-[#233B4D] text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(53,88,114,0.15)] active:scale-[0.98]"
          >
            <ArrowLeft size={14} />
            Back to Homepage
          </Link>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              to="/patient/search"
              className="py-2.5 px-3 bg-[#F7F8F0] hover:bg-[#EEF0E5] border border-[#7AAACE]/60 rounded-xl text-xs font-bold text-[#355872] transition flex items-center justify-center gap-1.5"
            >
              <Search size={13} />
              Find a Doctor
            </Link>

            <Link
              to="/login"
              className="py-2.5 px-3 bg-[#F7F8F0] hover:bg-[#EEF0E5] border border-[#7AAACE]/60 rounded-xl text-xs font-bold text-[#355872] transition flex items-center justify-center gap-1.5"
            >
              Portal Login
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 text-center text-xs font-semibold text-[#4A6478]/80">
        Healthcare Management System · High-Performance Clinical Platform
      </footer>
    </div>
  );
}
