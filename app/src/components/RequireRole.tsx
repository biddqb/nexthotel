import { Navigate } from "react-router-dom";
import { hasRoleAtLeast, useAuth } from "../lib/auth";
import type { Role } from "../lib/types";
import type { ReactElement } from "react";

/**
 * Gate a route by role. If the current user doesn't have `minRole`,
 * redirect to /calendar (the landing page everyone can see).
 */
export function RequireRole({
  minRole,
  children,
}: {
  minRole: Role;
  children: ReactElement;
}) {
  const { user } = useAuth();
  if (!hasRoleAtLeast(user, minRole)) {
    return <Navigate to="/calendar" replace />;
  }
  return children;
}
