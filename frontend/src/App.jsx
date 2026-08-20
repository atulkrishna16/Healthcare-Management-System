import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import './index.css';

// Landing & Auth Pages
import LandingPage from './portals/LandingPage';
import LoginPage from './portals/LoginPage';
import RegisterPage from './portals/RegisterPage';

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

function ProtectedRoute({ children }) {
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

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Patient Portal */}
            <Route
              path="/patient"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PatientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PatientDashboard />} />
              <Route path="search" element={<SearchDoctors />} />
              <Route path="book/:doctorId" element={<BookAppointment />} />
              <Route path="appointments" element={<MyAppointments />} />
              <Route path="appointments/:id" element={<AppointmentDetail />} />
            </Route>

            {/* Doctor Portal */}
            <Route
              path="/doctor"
              element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <DoctorLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DoctorDashboard />} />
              <Route path="appointments/:id" element={<DoctorAppointmentDetail />} />
            </Route>

            {/* Admin Portal */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="doctors" element={<AdminDoctors />} />
              <Route path="notifications" element={<AdminNotifications />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
