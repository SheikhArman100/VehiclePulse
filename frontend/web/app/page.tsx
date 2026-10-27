export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/60 p-8 shadow-2xl backdrop-blur-md">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Vehicle<span className="text-blue-500">Pulse</span>
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Real-Time Vehicle Telemetry &amp; Event Streaming Platform.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-slate-500">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-400 border border-emerald-500/20">
            Frontend Root Active
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 font-medium text-blue-400 border border-blue-500/20">
            Next.js App Router
          </span>
        </div>
      </div>
    </main>
  );
}
