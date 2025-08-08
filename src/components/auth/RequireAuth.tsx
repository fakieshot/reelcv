import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuthUser from "@/hooks/useAuthUser";

export default function RequireAuth({
  children,
  verified = false,
}: {
  children: ReactNode;
  verified?: boolean;
}) {
  const { user, verified: isVerified, loading } = useAuthUser();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (verified && !isVerified) {
    return <Navigate to="/check-email" replace />;
  }

  return <>{children}</>;
}
