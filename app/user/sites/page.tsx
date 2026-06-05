"use client";

import { useEffect, useState } from "react";

type Site = {
  id: number;
  name: string;
  code: string;
  active: boolean;
};

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [active, setActive] = useState(true);
  const [editing, setEditing] = useState<Site | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadSites() {
    const res = await fetch(`/api/sites?_ts=${Date.now()}`, {
      cache: "no-store",
    });

    const data = await res.json();
    setSites(Array.isArray(data.sites) ? data.sites : []);
  }

  useEffect(() => {
    loadSites();
  }, []);

  function resetForm() {
    setName("");
    setCode("");
    setActive(true);
    setEditing(null);
    setError("");
  }

  async function saveSite(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/sites", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          name,
          code,
          active,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur enregistrement site");
        return;
      }

      resetForm();
      await loadSites();
    } catch {
      setError("Erreur serveur");
    } finally {
      setLoading(false);
    }
  }

  async function disableSite(id: number) {
    if (!confirm("Désactiver ce site ?")) return;

    await fetch(`/api/sites?id=${id}`, {
      method: "DELETE",
    });

    await loadSites();
  }

  function startEdit(site: Site) {
    setEditing(site);
    setName(site.name);
    setCode(site.code);
    setActive(site.active);
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 text-slate-900 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
            Paramètres
          </p>
          <h1 className="mt-2 text-2xl font-black md:text-3xl">
            Gestion des sites
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            Créez les sites de l’école : Strelitzia School, International School, etc.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[390px_1fr]">
          <form
            onSubmit={saveSite}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-black">
              {editing ? "Modifier un site" : "Créer un site"}
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-black text-slate-700">
                  Nom du site
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: International School"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-300 px-4 font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-black text-slate-700">
                  Code site
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: INTERNATIONAL"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-300 px-4 font-bold uppercase outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Laissez vide pour générer automatiquement.
                </p>
              </div>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black">
                Site actif
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-5 w-5 accent-blue-600"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 flex-1 rounded-2xl bg-blue-600 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Enregistrement..." : editing ? "Modifier" : "Créer"}
                </button>

                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-12 rounded-2xl border border-slate-300 bg-white px-5 font-black text-slate-700 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">Sites enregistrés</h2>
                <p className="text-sm font-semibold text-slate-500">
                  {sites.length} site{sites.length > 1 ? "s" : ""}
                </p>
              </div>

              <button
                onClick={loadSites}
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
              >
                Actualiser
              </button>
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="p-3 text-left">Nom</th>
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr key={site.id} className="border-t border-slate-200">
                      <td className="p-3 font-black">{site.name}</td>
                      <td className="p-3 font-bold text-slate-600">{site.code}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            site.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {site.active ? "ACTIF" : "INACTIF"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => startEdit(site)}
                          className="mr-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => disableSite(site.id)}
                          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white"
                        >
                          Désactiver
                        </button>
                      </td>
                    </tr>
                  ))}

                  {sites.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center font-bold text-slate-500">
                        Aucun site créé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{site.name}</h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        Code : {site.code}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        site.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {site.active ? "ACTIF" : "INACTIF"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => startEdit(site)}
                      className="rounded-xl bg-blue-600 px-3 py-3 text-sm font-black text-white"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => disableSite(site.id)}
                      className="rounded-xl bg-red-600 px-3 py-3 text-sm font-black text-white"
                    >
                      Désactiver
                    </button>
                  </div>
                </div>
              ))}

              {sites.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center font-bold text-slate-500">
                  Aucun site créé
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}