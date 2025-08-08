import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import useAuthUser from "@/hooks/useAuthUser";

export default function RoleGate({
  allow,
  children,
}: {
  allow: "employer" | "jobseeker";
  children: ReactNode;
}) {
  const { role, loading } = useAuthUser();
  if (loading) return null;
  if (role !== allow) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
