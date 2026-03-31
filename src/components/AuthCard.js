export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="card w-full max-w-md p-6 sm:p-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}
