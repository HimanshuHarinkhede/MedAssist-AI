/**
 * ProtectedRoute.tsx
 *
 * Strict Role-Based Route Guard.
 * Ensures:
 *   1. Unauthenticated users are redirected to /login
 *   2. Users can ONLY access portals corresponding to their assigned role
 *   3. Unauthorized attempts (e.g. nurse accessing /doctor/*) are blocked and
 *      redirected to their authorized dashboard with an alert.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getUser, getToken } from "@/lib/api";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

const ROLE_DEFAULT_DASHBOARDS: Record<string, string> = {
  doctor: "/doctor/dashboard",
  nurse: "/staff/dashboard",
  pharmacist: "/staff/dashboard",
  lab_technician: "/staff/dashboard",
  receptionist: "/reception/dashboard",
  clinic_admin: "/admin/dashboard",
  platform_admin: "/admin/dashboard",
  patient: "/patient/dashboard",
};

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const token = getToken();
  const user = getUser();
  const hasAlerted = useRef(false);

  // 1. Not logged in -> redirect to login
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role check
  const isAllowed = allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isAllowed && !hasAlerted.current) {
      hasAlerted.current = true;
      toast.error(`⛔ Access Denied: You do not have permission to view that portal.`);
    }
  }, [isAllowed]);

  if (!isAllowed) {
    const fallbackPath = ROLE_DEFAULT_DASHBOARDS[user.role] || "/";
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}
