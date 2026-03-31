"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import AuthCard from "@/components/AuthCard";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        throw new Error(loginResult.error);
      }

      router.push("/dashboard");
      router.refresh();
    } catch (registerError) {
      setError(registerError.message || "Registration failed.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_0%_0%,#dff0ff,transparent_40%),radial-gradient(circle_at_100%_0%,#ffe7cc,transparent_40%),linear-gradient(180deg,#f8fbff,#fffaf2)] p-4">
      <AuthCard title="Create account" subtitle="Start sending Telegram campaigns in minutes.">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <input
            className="input"
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? "Creating account..." : "Register"}
          </button>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <p className="mt-5 text-sm text-slate-700">
          Already have an account? <Link className="font-semibold text-[var(--brand)]" href="/login">Login here</Link>
        </p>
      </AuthCard>
    </div>
  );
}
