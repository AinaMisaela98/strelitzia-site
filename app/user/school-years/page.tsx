"use client";

import { useEffect, useState } from "react";

type SchoolYear = {
  id: number;
  name: string;
  active: boolean;
};

export default function SchoolYearsPage() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadYears() {
    const res = await fetch("/api/school-years", { cache: "no-store" });
    const data = await res.json();
    setYears(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadYears();
  }, []);

  async function createYear(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Soraty aloha ny année scolaire");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/school-years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || "Erreur création année scolaire");
      return;
    }

    setName("");
    loadYears();
  }

  async function activateYear(id: number) {
    const res = await fetch(`/api/school-years/${id}/activate`, {
      method: "PUT",
    });

    if (!res.ok) {
      alert("Erreur activation");
      return;
    }

    loadYears();
  }

  async function deleteYear(year: SchoolYear) {
    if (year.active) {
      alert("Tsy afaka supprimena ny année scolaire active.");
      return;
    }

    const ok = confirm(`Supprimer l'année scolaire ${year.name} ?`);
    if (!ok) return;

    setDeletingId(year.id);

    const res = await fetch(`/api/school-years/${year.id}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => null);
    setDeletingId(null);

    if (!res.ok) {
      alert(data?.error || "Suppression impossible");
      return;
    }

    loadYears();
  }

  return (
    <main className="min-h-screen bg-[#070d18] px-3 py-4 text-white sm:px-5 md:p-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">
              Années scolaires
            </h1>
            <p className="text-sm text-slate-400">
              Gestion de l’année active
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/user")}
            className="w-full rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 sm:w-auto"
          >
            Retour
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-xl">
          <div className="border-b border-white/10 p-3 sm:p-4">
            <form
              onSubmit={createYear}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : 2026-2027"
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-500 sm:py-2"
              />

              <button
                disabled={loading}
                className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold hover:bg-red-700 disabled:opacity-50 sm:w-auto sm:py-2"
              >
                {loading ? "Ajout..." : "Ajouter"}
              </button>
            </form>
          </div>

          {/* Mobile */}
          <div className="space-y-3 p-3 sm:hidden">
            {years.map((year) => (
              <div
                key={year.id}
                className="rounded-xl border border-white/10 bg-slate-950/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Année scolaire</p>
                    <h2 className="text-lg font-black">{year.name}</h2>
                  </div>

                  {year.active ? (
                    <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-400">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs text-slate-300">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  {!year.active && (
                    <button
                      onClick={() => activateYear(year.id)}
                      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold hover:bg-green-700"
                    >
                      Activer
                    </button>
                  )}

                  <button
                    onClick={() => deleteYear(year)}
                    disabled={deletingId === year.id}
                    className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-50"
                  >
                    {deletingId === year.id ? "Suppression..." : "Supprimer"}
                  </button>
                </div>
              </div>
            ))}

            {years.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-slate-950/70 p-8 text-center text-sm text-slate-400">
                Aucune année scolaire
              </div>
            )}
          </div>

          {/* Desktop */}
          <div className="hidden p-4 sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-3 text-left">Année scolaire</th>
                  <th className="py-3 text-left">Statut</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {years.map((year) => (
                  <tr
                    key={year.id}
                    className="border-b border-white/10 hover:bg-white/[0.03]"
                  >
                    <td className="py-3 font-bold">{year.name}</td>

                    <td className="py-3">
                      {year.active ? (
                        <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs text-slate-300">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        {!year.active && (
                          <button
                            onClick={() => activateYear(year.id)}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold hover:bg-green-700"
                          >
                            Activer
                          </button>
                        )}

                        <button
                          onClick={() => deleteYear(year)}
                          disabled={deletingId === year.id}
                          className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-50"
                        >
                          {deletingId === year.id
                            ? "Suppression..."
                            : "Supprimer"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {years.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      Aucune année scolaire
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}