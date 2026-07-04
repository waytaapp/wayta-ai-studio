import React from 'react';
import { User, UserRole } from '../types';

interface ProtectedRouteProps {
  user: User | null;
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  user, 
  allowedRoles, 
  children, 
  fallback 
}) => {
  if (!user || !allowedRoles.includes((user.role as string)?.toUpperCase() as UserRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
