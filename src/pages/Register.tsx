// src/pages/Register.tsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { auth, firestore } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button"; // αν έχεις shadcn button, αλλιώς βάλτο σε <button>

export default function Register() {
  const { search } = useLocation();
  const [role, setRole] = useState<"employer" | "jobseeker" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ΝΕΟ: structured error
  const [uiError, setUiError] = useState<{ code?: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Optional: προεπιλογή ρόλου από query param ?role=employer|jobseeker
  useEffect(() => {
    const q = new URLSearchParams(search);
    const r = q.get("role");
    if (r === "employer" || r === "jobseeker") setRole(r);
  }, [search]);

  // map firebase error codes -> friendly text
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

  async function handleRegister() {
    setUiError(null);
    setLoading(true);

    try {
      if (!role) {
        setUiError({ text: "Please choose if you are an Employer or a Job Seeker." });
        setLoading(false);
        return;
      }

      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Save profile in Firestore
      await setDoc(doc(firestore, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        role,
        createdAt: serverTimestamp(),
      });

      // Send verification email
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login?verifyEmail=true`,
      });

      // Redirect σε όμορφη σελίδα check email (αν την έχεις υλοποιήσει) — αλλιώς δείξε toast/badge
      window.location.href = "/check-email";
    } catch (err: any) {
      const code = err?.code as string | undefined;
      setUiError({ code, text: prettifyAuthError(code) });
    } finally {
      setLoading(false);
    }
  }

  // ΝΕΟ: reset password action όταν υπάρχει ήδη account
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-50 p-6">
      <h1 className="text-4xl font-bold mb-10 text-gray-800">Who are you?</h1>

      {/* Role Selection */}
      <div className="flex gap-8 mb-10">
        <button
          onClick={() => setRole("employer")}
          className={`w-48 h-48 rounded-2xl shadow-md border-2 flex flex-col items-center justify-center gap-4 text-center text-lg font-medium transition ${
            role === "employer"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-800 hover:border-indigo-300"
          }`}
        >
          <span className="text-5xl">💼</span>
          I’m an Employer
        </button>

        <button
          onClick={() => setRole("jobseeker")}
          className={`w-48 h-48 rounded-2xl shadow-md border-2 flex flex-col items-center justify-center gap-4 text-center text-lg font-medium transition ${
            role === "jobseeker"
              ? "bg-green-500 text-white border-green-500"
              : "bg-white text-gray-800 hover:border-green-300"
          }`}
        >
          <span className="text-5xl">🧑‍💼</span>
          I’m a Job Seeker
        </button>
      </div>

      {/* ΝΕΟ: Friendly error banner */}
      {uiError && (
        <div className="w-full max-w-md mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-4">
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

      {/* Form */}
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8 space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />

        <Button
          onClick={handleRegister}
          disabled={loading || !role || !email || !password}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Register"}
        </Button>
      </div>
    </div>
  );
}
