"use client";

export default function AdminSettingsPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <section className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
        <h1 className="text-2xl font-black">Paramètres</h1>
        <p className="mt-2 text-slate-400">
          Page paramètres administrateur.
        </p>

        <div className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="font-bold text-white">Module prêt</p>
          <p className="mt-1 text-sm text-slate-400">
            Cette page est séparée de /user/settings pour éviter l’erreur de build.
          </p>
        </div>
      </section>
    </main>
  );
}