import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Index from '@/pages/Index';
import LoginPage from '@/pages/LoginPage';
import InstallerUploadPage from '@/pages/InstallerUploadPage';
import CRMDashboard from '@/components/crm/CRMDashboard';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public — customer-facing bill analysis tool */}
            <Route path="/" element={<AppProvider><Index /></AppProvider>} />
            <Route path="/installer-upload" element={<InstallerUploadPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected — staff CRM */}
            <Route
              path="/crm"
              element={
                <ProtectedRoute>
                  <CRMDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
