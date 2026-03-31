import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-6 py-10 sm:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,#dbf4ff_0,#dbf4ff_22%,transparent_50%),radial-gradient(circle_at_80%_20%,#ffe7bf_0,#ffe7bf_18%,transparent_48%),linear-gradient(120deg,#fdfcf8,#f4fbff_40%,#fff7ea)]" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl border border-white/40 bg-white/60 px-5 py-4 shadow-[0_20px_60px_-40px_rgba(16,24,40,0.45)] backdrop-blur">
        <p className="font-heading text-xl font-semibold tracking-tight">TeleBlaster</p>
        <div className="flex items-center gap-3">
          <Link className="btn btn-ghost" href="/login">
            Login
          </Link>
          <Link className="btn btn-primary" href="/register">
            Start Free
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-10 grid w-full max-w-6xl gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <section>
          <p className="badge mb-4">Telegram Messaging SaaS</p>
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Launch Telegram campaigns at scale, without chaos.
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-700 sm:text-lg">
            Secure login, recipient upload, delivery logs, and campaign history in one clean dashboard for teams that run bulk outreach.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/register">
              Create Account
            </Link>
            <Link className="btn btn-ghost" href="/dashboard">
              Open Dashboard
            </Link>
          </div>
        </section>

        <section className="card">
          <h2 className="font-heading text-xl font-semibold">Built for delivery confidence</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>Protected dashboard for each user account</li>
            <li>Batch sending with per-chat success and error logs</li>
            <li>Rate limiting controls to avoid API flood issues</li>
            <li>Campaign history with success and failure summaries</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
