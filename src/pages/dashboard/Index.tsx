// src/components/dashboard/Index.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthUser from "@/hooks/useAuthUser";

export default function DashboardIndex() {
  const { role, loading } = useAuthUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (role === "employer") navigate("/dashboard/employer", { replace: true });
    else if (role === "jobseeker") navigate("/dashboard/jobseeker", { replace: true });
    else navigate("/", { replace: true });
  }, [role, loading, navigate]);

  return null;
}
