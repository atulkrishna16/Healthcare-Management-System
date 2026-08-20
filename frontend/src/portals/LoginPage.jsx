import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import ColorBends from '../components/ColorBends/ColorBends';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Stethoscope, User, HeartPulse } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name}`);
      navigate(`/${user.role}`);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed. Check credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    const demos = {
      patient: { email: 'patient@demo.com', password: 'password123' },
      doctor: { email: 'doctor@demo.com', password: 'password123' },
      admin: { email: 'admin@demo.com', password: 'password123' },
    };
    setForm(demos[role]);
    setLoading(true);
    setError('');
    try {
      const user = await login(demos[role]);
      toast.success(`Logged in as Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`);
      navigate(`/${user.role}`);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Demo login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#F7F8F0]">
      {/* Autonomous Background ColorBends Animation (Zero Mouse Reactivity, Exact Palette) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <ColorBends
          colors={['#355872', '#7AAACE', '#9CD5FF', '#355872']}
          rotation={60}
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

      <div className="relative z-10 w-full max-w-[440px] px-4 py-8">
        <div className="bg-white/95 backdrop-blur-sm border border-[#7AAACE]/60 rounded-3xl p-8 sm:p-10 shadow-[0_10px_25px_-3px_rgba(53,88,114,0.15)]">
          
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9CD5FF]/30 border border-[#7AAACE]/50 text-[#355872] text-xs font-bold tracking-wider uppercase mb-3 hover:bg-[#9CD5FF]/50 transition">
              <HeartPulse size={13} className="text-[#355872]" />
              HMS Clinical Portal
            </Link>
            <h1 className="text-3xl font-extrabold text-[#355872] tracking-tight font-display">
              HMS
            </h1>
            <p className="text-xs font-semibold text-[#4A6478] tracking-wide uppercase mt-0.5">
              Healthcare Management System
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7AAACE]" />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 bg-[#F7F8F0]/60 border border-[#7AAACE] rounded-xl text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872] focus:ring-2 focus:ring-[#9CD5FF] transition text-sm font-medium"
                  placeholder="name@clinic.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#355872] uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7AAACE]" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full pl-10 pr-10 py-3 bg-[#F7F8F0]/60 border border-[#7AAACE] rounded-xl text-[#355872] placeholder-[#7AAACE] focus:outline-none focus:border-[#355872] focus:ring-2 focus:ring-[#9CD5FF] transition text-sm font-medium"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7AAACE] hover:text-[#355872] transition"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#B5533C]/10 border border-[#B5533C]/30 rounded-xl text-[#B5533C] text-xs font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#355872] hover:bg-[#233B4D] text-white rounded-xl font-bold text-sm transition-all shadow-[0_4px_12px_rgba(53,88,114,0.2)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Switch to Register */}
          <div className="mt-6 pt-6 border-t border-[#7AAACE]/30 text-center">
            <p className="text-xs text-[#4A6478]">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-[#355872] hover:underline">
                Create Account
              </Link>
            </p>
          </div>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-4 border-t border-[#7AAACE]/30">
            <p className="text-[10px] uppercase font-bold text-[#4A6478] tracking-wider mb-2.5 text-center">
              Quick One-Click Demo Access
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('patient')}
                className="p-2 rounded-xl bg-[#F7F8F0] hover:bg-[#EEF0E5] border border-[#7AAACE]/50 text-xs font-bold text-[#355872] transition flex flex-col items-center gap-1 active:scale-[0.96]"
              >
                <User size={14} className="text-[#355872]" />
                Patient
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('doctor')}
                className="p-2 rounded-xl bg-[#F7F8F0] hover:bg-[#EEF0E5] border border-[#7AAACE]/50 text-xs font-bold text-[#355872] transition flex flex-col items-center gap-1 active:scale-[0.96]"
              >
                <Stethoscope size={14} className="text-[#355872]" />
                Doctor
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                className="p-2 rounded-xl bg-[#F7F8F0] hover:bg-[#EEF0E5] border border-[#7AAACE]/50 text-xs font-bold text-[#355872] transition flex flex-col items-center gap-1 active:scale-[0.96]"
              >
                <ShieldCheck size={14} className="text-[#355872]" />
                Admin
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
