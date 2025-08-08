import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, firestore } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"employer" | "jobseeker" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    if (!role) {
      setError("Please select a role.");
      return;
    }
    try {
      // Create user
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Save user profile to Firestore
      await setDoc(doc(firestore, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        role,
        createdAt: serverTimestamp()
      });

      // Send email verification
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login?verifyEmail=true`
      });

      // Sign out to force verification
      await signOut(auth);

      // Redirect to login with flag
      navigate("/login?verifyEmail=true");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-50 p-6">
      <h1 className="text-4xl font-bold mb-10 text-gray-800">Who are you?</h1>

      {/* Role Selection */}
      <div className="flex gap-8 mb-10">
        <button
          onClick={() => setRole("employer")}
          className={`w-48 h-48 rounded-2xl shadow-md border-2 flex flex-col items-center justify-center gap-4 text-center text-lg font-medium transition ${
            role === "employer"
              ? "bg-indigo-500 text-white border-indigo-500"
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

      {/* Form */}
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8 space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <input
          type="email"
          placeholder="Email Address"
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
        <button
          onClick={handleRegister}
          disabled={!role || !name || !email || !password}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
        >
          Register
        </button>
      </div>
    </div>
  );
}