import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import './index.css';

// Landing & Auth Pages
import LandingPage from './portals/LandingPage';
import LoginPage from './portals/LoginPage';
import RegisterPage from './portals/RegisterPage';
import NotFoundPage from './portals/NotFoundPage';

// Patient Portal
import PatientLayout from './portals/patient/PatientLayout';
import PatientDashboard from './portals/patient/PatientDashboard';
import SearchDoctors from './portals/patient/SearchDoctors';
import BookAppointment from './portals/patient/BookAppointment';
import MyAppointments from './portals/patient/MyAppointments';
import AppointmentDetail from './portals/patient/AppointmentDetail';

// Doctor Portal
import DoctorLayout from './portals/doctor/DoctorLayout';
import DoctorDashboard from './portals/doctor/DoctorDashboard';
import DoctorAppointmentDetail from './portals/doctor/DoctorAppointmentDetail';

// Admin Portal
import AdminLayout from './portals/admin/AdminLayout';
import AdminDashboard from './portals/admin/AdminDashboard';
import AdminDoctors from './portals/admin/AdminDoctors';
import AdminNotifications from './portals/admin/AdminNotifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

/**
 * RequireRole — single route guard for the entire app.
 * loading → null (suppress flash), not authed → /login, wrong role → own portal.
 */
function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0c1428',
                color: '#f0f6ff',
                border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: '12px',
              },
            }}
          />
          <Routes>
            {/* Root Landing Splash */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth — redirect away if already logged in */}
            <Route path="/login" element={<RequireRole role={null}><LoginPage /></RequireRole>} />
            <Route path="/register" element={<RequireRole role={null}><RegisterPage /></RequireRole>} />

            {/* Patient Portal — patients only */}
            <Route path="/patient" element={<RequireRole role="patient"><PatientLayout /></RequireRole>}>
              <Route index element={<PatientDashboard />} />
              <Route path="search" element={<SearchDoctors />} />
              <Route path="book/:doctorId" element={<BookAppointment />} />
              <Route path="appointments" element={<MyAppointments />} />
              <Route path="appointments/:id" element={<AppointmentDetail />} />
            </Route>

            {/* Doctor Portal — doctors only */}
            <Route path="/doctor" element={<RequireRole role="doctor"><DoctorLayout /></RequireRole>}>
              <Route index element={<DoctorDashboard />} />
              <Route path="appointments/:id" element={<DoctorAppointmentDetail />} />
            </Route>

            {/* Admin Portal — admins only */}
            <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
              <Route index element={<AdminDashboard />} />
              <Route path="doctors" element={<AdminDoctors />} />
              <Route path="notifications" element={<AdminNotifications />} />
            </Route>

            {/* 404 Custom Not Found */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
