import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../lib/api';
import toast from 'react-hot-toast';
import ColorBends from '../components/ColorBends/ColorBends';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Stethoscope, User, HeartPulse } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Google OAuth redirect callback
  // Token is in the URL *fragment* (#), not the query string (?),
  // so it is never sent to any server and never logged by proxies/CDNs.
  useEffect(() => {
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace('#', ''));
    const googleToken = hashParams.get('google_token');
    const googleError = searchParams.get('google_error');

    if (googleToken) {
      // Immediately clear the fragment from the URL so the token
      // doesn't stay visible in the address bar or browser history.
      window.history.replaceState(null, '', window.location.pathname);

      localStorage.setItem('accessToken', googleToken);
      authApi.me()
        .then((res) => {
          const user = res.data;
          toast.success(`Signed in with Google as ${user.name}`);
          navigate(`/${user.role}`, { replace: true });
        })
        .catch(() => {
          toast.error('Failed to load user profile after Google sign-in');
        });
    } else if (googleError) {
      toast.error(`Google sign-in error: ${googleError}`);
    }
  }, [searchParams, navigate]);

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const res = await authApi.getGoogleAuthUrl();
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not start Google Sign-In';
      toast.error(msg);
      setGoogleLoading(false);
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
      {/* Autonomous Background ColorBends Animation */}
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

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-3 px-4 mb-5 bg-white hover:bg-[#F7F8F0] border border-[#7AAACE] rounded-xl font-bold text-sm text-[#355872] transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-[#7AAACE]/30 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-bold text-[#4A6478] uppercase tracking-wider">
              or email
            </span>
            <div className="border-t border-[#7AAACE]/30 w-full"></div>
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
