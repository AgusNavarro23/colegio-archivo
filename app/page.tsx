'use client';

import { useAuthStore } from '@/store/auth';
import { LoginForm } from '@/components/auth/login-form';
import { ClientDashboard } from '@/components/dashboard/client-dashboard';
import { EmployeeDashboard } from '@/components/dashboard/employee-dashboard';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { Scale } from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  switch (user?.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'EMPLOYEE':
      return <EmployeeDashboard />;
    case 'CLIENT':
    default:
      return <ClientDashboard />;
  }
}
