"use client";

import { useEffect, useState } from "react";

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    label: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  async function loadRoles() {
    const res = await fetch("/api/roles", { cache: "no-store" });
    const data = await res.json();
    setRoles(data.roles || []);
  }

  useEffect(() => {
    loadRoles();
  }, []);

  async function createRole() {
    if (!form.name || !form.label) {
      alert("Nom et libellé obligatoires");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      alert(data.error || "Erreur création rôle");
      return;
    }

    setForm({ name: "", label: "", description: "" });
    loadRoles();
  }

  async function toggleRole(role: any) {
    await fetch(`/api/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !role.active }),
    });

    loadRoles();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-black text-slate-900">
          Gestion des rôles utilisateurs
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Admin peut créer des rôles personnalisés : Administration, Comptable,
          Caissier, Surveillant...
        </p>

        <div className="mt-6 grid gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-3">
          <input
            placeholder="Nom technique ex: ADMINISTRATION"
            value={form.name}
            onChange={(e) =>
              setForm((p) => ({ ...p, name: e.target.value }))
            }
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Libellé affiché ex: Administration"
            value={form.label}
            onChange={(e) =>
              setForm((p) => ({ ...p, label: e.target.value }))
            }
            className="rounded-lg border px-3 py-2"
          />

          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            className="rounded-lg border px-3 py-2"
          />

          <button
            onClick={createRole}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50 md:col-span-3"
          >
            {loading ? "Création..." : "+ Créer le rôle"}
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-3 py-2 text-left">Nom</th>
                <th className="px-3 py-2 text-left">Libellé</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-center">Statut</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b">
                  <td className="px-3 py-2 font-bold">{role.name}</td>
                  <td className="px-3 py-2">{role.label}</td>
                  <td className="px-3 py-2">{role.description || "-"}</td>
                  <td className="px-3 py-2 text-center">
                    {role.active ? "Actif" : "Inactif"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => toggleRole(role)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold text-white ${
                        role.active ? "bg-red-600" : "bg-green-600"
                      }`}
                    >
                      {role.active ? "Désactiver" : "Activer"}
                    </button>
                  </td>
                </tr>
              ))}

              {roles.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Aucun rôle trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}