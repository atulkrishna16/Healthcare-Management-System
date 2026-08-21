import { Link } from 'react-router-dom';
import ColorBends from '../components/ColorBends/ColorBends';
import { ArrowLeft, HeartPulse } from 'lucide-react';

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
      </header>

      {/* 404 Hero Section */}
      <main className="relative z-10 max-w-lg mx-auto px-6 py-12 text-center space-y-8 my-auto">
        <div className="space-y-3">
          <h1 className="text-6xl sm:text-7xl font-black text-[#355872] tracking-tight font-display">
            Oh noo.. 404
          </h1>
          <p className="text-base sm:text-lg text-[#4A6478] font-medium leading-relaxed max-w-md mx-auto">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="flex justify-center">
          <Link
            to="/"
            className="px-6 py-3.5 bg-[#355872] hover:bg-[#233B4D] text-white rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2.5 shadow-[0_6px_20px_rgba(53,88,114,0.2)] active:scale-[0.98]"
          >
            <ArrowLeft size={16} />
            Back to Homepage
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 text-center text-xs font-semibold text-[#4A6478]/80">
        Healthcare Management System · High-Performance Clinical Platform
      </footer>
    </div>
  );
}
