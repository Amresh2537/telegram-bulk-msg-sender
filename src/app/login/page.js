"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import AuthCard from "@/components/AuthCard";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_0%_0%,#dff0ff,transparent_40%),radial-gradient(circle_at_100%_0%,#ffe7cc,transparent_40%),linear-gradient(180deg,#f8fbff,#fffaf2)] p-4">
      <AuthCard title="Welcome back" subtitle="Log in to manage your Telegram campaigns.">
        <form className="grid gap-4" onSubmit={handleSubmit}>
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
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Login"}
          </button>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

        <p className="mt-5 text-sm text-slate-700">
          No account? <Link className="font-semibold text-[var(--brand)]" href="/register">Register here</Link>
        </p>
      </AuthCard>
    </div>
  );
}
