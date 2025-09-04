// src/pages/Register.tsx
import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { auth, firestore } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";

export default function Register() {
  const { search } = useLocation();

  const [role, setRole] = useState<"employer" | "jobseeker" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [uiError, setUiError] = useState<{ code?: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Προεπιλογή ρόλου από ?role=
  useEffect(() => {
    const q = new URLSearchParams(search);
    const r = q.get("role");
    if (r === "employer" || r === "jobseeker") setRole(r);
  }, [search]);

  // Υπολογισμός ισχύος κωδικού (0–4)
  const passScore = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  const passLabel = ["Too weak", "Weak", "Okay", "Good", "Strong"][passScore];



  
  function prettifyAuthError(code?: string) {
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered. You can sign in or reset your password.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Your password is too weak. Use at least 6 characters.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      default:
        return "Something went wrong. Please try again.";
    }
  }


// κοντά στην κορυφή του αρχείου
const toSearchKey = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();




  async function handleRegister() {
    setUiError(null);
    setLoading(true);

    try {
      if (!role) {
        setUiError({ text: "Please choose if you are an Employer or a Job Seeker." });
        setLoading(false);
        return;
      }
      if (!acceptTerms) {
        setUiError({ text: "Please accept the Terms of Service and Privacy Policy." });
        setLoading(false);
        return;
      }

      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Store base user doc
   await setDoc(doc(firestore, "users", user.uid), {
  uid: user.uid,
  name,
  nameLower: toSearchKey(name || user.email.split("@")[0]),
  email,
  role,
  visibility: "public",        // αν θες να είναι ορατοί στο search
  createdAt: serverTimestamp(),
});



      // Email verification
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login?verifyEmail=true`,
      });

      window.location.href = "/check-email";
    } catch (err: any) {
      const code = err?.code as string | undefined;
      setUiError({ code, text: prettifyAuthError(code) });
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email) return;
    try {
      await sendPasswordResetEmail(auth, email);
      setUiError({ text: "Password reset email sent. Please check your inbox." });
    } catch (err: any) {
      const code = err?.code;
      setUiError({ code, text: prettifyAuthError(code) });
    }
  }

  const canSubmit =
    !!role && !!email && !!password && acceptTerms && !loading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-white to-blue-50 p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-2">Choose your role and sign up to get started</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            type="button"
            onClick={() => setRole("employer")}
            aria-pressed={role === "employer"}
            className={`group rounded-2xl border bg-white p-5 text-left transition shadow-sm hover:shadow-md focus:outline-none
              ${role === "employer" ? "ring-2 ring-indigo-500" : "border-gray-200"}`}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">💼</div>
              <div>
                <div className="font-semibold text-gray-900">I’m an Employer</div>
                <div className="text-xs text-gray-500">Post jobs & review candidates</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setRole("jobseeker")}
            aria-pressed={role === "jobseeker"}
            className={`group rounded-2xl border bg-white p-5 text-left transition shadow-sm hover:shadow-md focus:outline-none
              ${role === "jobseeker" ? "ring-2 ring-indigo-500" : "border-gray-200"}`}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">🧑‍💼</div>
              <div>
                <div className="font-semibold text-gray-900">I’m a Job Seeker</div>
                <div className="text-xs text-gray-500">Create a ReelCV & apply fast</div>
              </div>
            </div>
          </button>
        </div>

        {/* Error banner */}
        {uiError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="font-medium">
                  {uiError.code === "auth/email-already-in-use"
                    ? "Account already exists"
                    : "We couldn’t complete your sign up"}
                </p>
                <p className="text-sm mt-1">{uiError.text}</p>

                {uiError.code === "auth/email-already-in-use" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link to="/login">
                      <Button size="sm" variant="secondary">Go to Login</Button>
                    </Link>
                    <button
                      onClick={handleResetPassword}
                      className="text-sm text-indigo-700 underline hover:text-indigo-800"
                    >
                      Reset password
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="rounded-2xl bg-white shadow-lg ring-1 ring-gray-100 p-6 sm:p-8">
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="you@workmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {role === "employer" && (
                <p className="mt-1.5 text-xs text-gray-500">Tip: use your company email for faster verification.</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPass ? "text" : "password"}
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {/* Strength meter */}
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      passScore <= 1
                        ? "bg-red-400"
                        : passScore === 2
                        ? "bg-yellow-400"
                        : passScore === 3
                        ? "bg-green-400"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${(passScore / 4) * 100}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">{passLabel}</div>
              </div>
            </div>

            {/* Terms */}
            <label className="mt-1 flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">
                I agree to the{" "}
                <Link to="/legal/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link to="/legal/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
              </span>
            </label>

            <Button
              onClick={handleRegister}
              disabled={!canSubmit}
              className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Register"}
            </Button>

            <p className="text-sm text-gray-500 text-center">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-600 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
