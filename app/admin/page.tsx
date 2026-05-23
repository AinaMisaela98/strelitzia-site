"use client";

import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "DIRECTEUR" | "SECRETAIRE";
  active: boolean;
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SECRETAIRE",
    active: true,
  });

  async function loadUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();

    const url = editingId ? `/api/users/${editingId}` : "/api/users";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Erreur");
      return;
    }

    setForm({
      name: "",
      email: "",
      password: "",
      role: "SECRETAIRE",
      active: true,
    });

    setEditingId(null);
    loadUsers();
  }

  function editUser(user: User) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      active: user.active,
    });
  }

  async function deleteUser(id: number) {
    if (!confirm("Supprimer cet utilisateur ?")) return;

    const res = await fetch(`/api/users/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Erreur suppression");
      return;
    }

    loadUsers();
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-slate-100 flex text-slate-900">
      <aside
        className={`fixed lg:static z-50 top-0 left-0 h-screen w-[280px] bg-[#071426] text-white flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-white/10">
          <h1 className="text-2xl font-black">
            NY <span className="text-green-400">SEKO</span>
            <span className="text-red-400">LIKO</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Gestion scolaire moderne</p>
        </div>

        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <div className="w-12 h-12 rounded-full bg-slate-300" />
          <div>
            <p className="font-bold">Administrateur</p>
            <p className="text-xs text-green-400">● En ligne</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scroll">
          <p className="text-xs text-slate-400 px-3 mt-2">PRINCIPAL</p>

          {[
            "Tableau de bord",
            "Liste des étudiants",
            "Inscrire un étudiant",
            "Paiement",
            "Classes",
            "Sections",
            "Années scolaires",
            "Sites",
          ].map((item, i) => (
            <button
              key={item}
              className={`w-full text-left px-4 py-3 rounded-xl transition ${
                i === 0
                  ? "bg-blue-600 text-white"
                  : "hover:bg-white/10 text-slate-200"
              }`}
            >
              {item}
            </button>
          ))}

          <p className="text-xs text-slate-400 px-3 pt-5">UTILISATEURS & ACCÈS</p>

          {["Utilisateurs", "Rôles", "Permissions"].map((item) => (
            <button
              key={item}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 text-slate-200"
            >
              {item}
            </button>
          ))}

          <p className="text-xs text-slate-400 px-3 pt-5">PARAMÈTRES</p>

          {["Paramètres généraux", "Mon profil", "Journal d’activités"].map(
            (item) => (
              <button
                key={item}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/10 text-slate-200"
              >
                {item}
              </button>
            )
          )}
        </nav>

        <div className="p-4">
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-bold"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}

      <section className="flex-1 min-w-0">
        <header className="bg-white border-b px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden bg-slate-100 px-3 py-2 rounded-lg"
            >
              ☰
            </button>

            <input
              className="hidden md:block w-[360px] border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Rechercher un étudiant, matricule, nom..."
            />
          </div>

          <div className="font-bold">Administrateur</div>
        </header>

        <div className="p-4 lg:p-8 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black">Dashboard Administrateur</h2>
              <p className="text-slate-500">
                Gestion des utilisateurs, rôles et accès.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold">
                Actualiser
              </button>
              <button className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold">
                Export Excel
              </button>
              <button className="bg-violet-600 text-white px-4 py-3 rounded-xl font-bold">
                Imprimer PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <Card title="Étudiants" value="464" />
            <Card title="Utilisateurs" value={String(users.length)} />
            <Card title="Année scolaire" value="2025-2026" />
            <Card title="Site" value="Strelitzia" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
            <form
              onSubmit={saveUser}
              className="bg-white rounded-2xl shadow-sm border p-6 space-y-4"
            >
              <h3 className="text-xl font-black">
                {editingId ? "Modifier utilisateur" : "Créer utilisateur"}
              </h3>

              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Nom complet"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Email login"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder={
                  editingId
                    ? "Nouveau mot de passe (optionnel)"
                    : "Mot de passe"
                }
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />

              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="SECRETAIRE">SECRETAIRE</option>
                <option value="DIRECTEUR">DIRECTEUR</option>
                <option value="ADMIN">ADMIN</option>
              </select>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                Compte actif
              </label>

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-bold">
                {editingId ? "Enregistrer modification" : "Créer le compte"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      name: "",
                      email: "",
                      password: "",
                      role: "SECRETAIRE",
                      active: true,
                    });
                  }}
                  className="w-full bg-slate-200 rounded-xl py-3 font-bold"
                >
                  Annuler
                </button>
              )}
            </form>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-5 border-b">
                <h3 className="text-xl font-black">Liste des utilisateurs</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-[#111827] text-white">
                    <tr>
                      <th className="p-4 text-left">Nom</th>
                      <th className="p-4 text-left">Email</th>
                      <th className="p-4 text-left">Rôle</th>
                      <th className="p-4 text-left">Statut</th>
                      <th className="p-4 text-left">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-blue-50">
                        <td className="p-4 font-bold">{user.name}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">
                          {user.active ? (
                            <span className="text-green-600 font-bold">Actif</span>
                          ) : (
                            <span className="text-red-600 font-bold">Bloqué</span>
                          )}
                        </td>
                        <td className="p-4 flex gap-2">
                          <button
                            onClick={() => editUser(user)}
                            className="bg-yellow-400 text-white px-3 py-2 rounded-lg font-bold"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteUser(user.id)}
                            className="bg-red-500 text-white px-3 py-2 rounded-lg font-bold"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}

                    {users.length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-slate-500" colSpan={5}>
                          Aucun utilisateur
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <StudentTable />
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white border rounded-2xl p-6 shadow-sm">
      <p className="text-slate-500">{title}</p>
      <h3 className="text-3xl font-black mt-2">{value}</h3>
    </div>
  );
}

function StudentTable() {
  const students = [
    ["ST0034", "Strelitzia School", "2025-2026", "31/10/2025", "VEROMANANTSOA", "Chan Jacyntha", "Feminin", "GRADE 6", "G6", "0340493034"],
    ["ST0035", "Strelitzia School", "2025-2026", "03/07/2025", "RAZANADRASOA", "Dither ULEP", "Masculin", "GRADE 6", "G6", "0327921266"],
    ["ST0037", "Strelitzia School", "2025-2026", "06/08/2025", "MERVAN", "Latifah Noemie", "Feminin", "GRADE 5", "G5A", "0341806868"],
    ["ST0038", "Strelitzia School", "2025-2026", "30/06/2025", "ANDRIAMBOLAFO", "Maité Kerenia", "Feminin", "GRADE 5", "G5A", "0340855083"],
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black">Listes des étudiants (464)</h3>
          <p className="text-slate-500">Page utilisateur/dashboard design école.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select className="border rounded-xl px-4 py-2">
            <option>Année scolaire : 2025-2026</option>
          </select>
          <select className="border rounded-xl px-4 py-2">
            <option>Classe : TOUT</option>
          </select>
          <select className="border rounded-xl px-4 py-2">
            <option>Série : TOUT</option>
          </select>
        </div>
      </div>

      <div className="p-4 flex flex-wrap gap-3">
        <input className="border rounded-xl px-4 py-3" placeholder="rechercher..." />
        <button className="bg-slate-900 text-white px-4 py-3 rounded-xl">Rechercher</button>
        <button className="bg-red-500 text-white px-4 py-3 rounded-xl">Initialiser</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px]">
          <thead className="bg-[#111827] text-white">
            <tr>
              {["N°", "Site", "AS", "Date inscription", "Nom", "Prénom(s)", "Sexe", "Classe", "Section", "Contact", "Actions"].map((h) => (
                <th key={h} className="p-4 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {students.map((s) => (
              <tr key={s[0]} className="border-b odd:bg-blue-50/50 hover:bg-blue-100">
                {s.map((v, i) => (
                  <td key={i} className={`p-4 ${i === 0 ? "text-red-500 font-bold" : ""}`}>
                    {v}
                  </td>
                ))}
                <td className="p-4 flex gap-2">
                  <button className="bg-blue-600 text-white px-3 py-2 rounded-lg">Voir</button>
                  <button className="bg-yellow-400 text-white px-3 py-2 rounded-lg">Edit</button>
                  <button className="bg-red-500 text-white px-3 py-2 rounded-lg">Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}