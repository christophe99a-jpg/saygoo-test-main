import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContextF';
import { getDashboardPath } from './roles';

export function PublicOnlyRoute({ children }) {
  const { session } = useAuth();

  if (session?.role) {
    return <Navigate to={getDashboardPath(session.role)} replace />;
  }

  return children;
}

export function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const { session } = useAuth();

  if (!session?.role) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (allowedRoles?.length && !allowedRoles.includes(session.role)) {
    return <Navigate to={getDashboardPath(session.role)} replace />;
  }

  return children;
}

export function AuthenticatedRoute({ children }) {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return children;
}
