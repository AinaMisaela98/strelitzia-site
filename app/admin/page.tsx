"use client";

import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "DIRECTEUR" | "SECRETAIRE";
  active: boolean;
};

const menus = [
  {
    title: "Tableau de bord",
    items: ["Dashboard admin", "Liste des étudiants", "Années scolaires", "Niveaux / Classes / Séries"],
  },
  {
    title: "Utilisateurs & accès",
    items: ["Utilisateurs", "Créer utilisateur"],
  },
  {
    title: "Paramètres",
    items: ["Paramètres généraux", "Journal d’activités"],
  },
];

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("Utilisateurs");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SECRETAIRE",
    active: true,
  });

  async function loadUsers() {
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleMenu(item: string) {
    if (item === "Liste des étudiants") {
      window.location.href = "/user";
      return;
    }

    if (item === "Années scolaires") {
      window.location.href = "/user/school-years";
      return;
    }

    if (item === "Niveaux / Classes / Séries") {
      window.location.href = "/user/academics";
      return;
    }

    setActivePage(item);
    setSidebarOpen(false);
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name || !form.email) {
      alert("Nom sy email obligatoire");
      return;
    }

    if (!editingId && !form.password) {
      alert("Mot de passe obligatoire rehefa mamorona utilisateur");
      return;
    }

    setLoading(true);

    const res = await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "Erreur utilisateur");
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
    setActivePage("Utilisateurs");
    loadUsers();
  }

  function editUser(user: User) {
    setEditingId(user.id);
    setActivePage("Créer utilisateur");
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      active: user.active,
    });
  }

  async function deleteUser(id: number) {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;

    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
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
    <main className="fixed inset-0 bg-[#eef2f7] flex overflow-hidden text-[12px] text-slate-900">
      <aside
        className={`fixed lg:relative z-50 h-full w-[230px] shrink-0 bg-[#4a4a4a] text-white flex flex-col border-r border-slate-600 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-[68px] bg-white flex items-center px-3 border-b">
          <div>
            <div className="text-[19px] font-black text-red-600 leading-none">STRELITZIA</div>
            <div className="text-[13px] font-black text-green-600">SCHOOL</div>
          </div>
        </div>

        <div className="bg-[#303030] px-3 py-3 flex gap-2 items-center">
          <div className="w-11 h-11 rounded-full bg-orange-300 flex items-center justify-center text-xl">
            👑
          </div>
          <div>
            <p className="font-bold">Administrateur</p>
            <p className="text-[10px] text-green-400">● En ligne</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto pb-3">
          {menus.map((menu) => (
            <div key={menu.title}>
              <div className="bg-[#2f3540] px-2 py-2 font-semibold flex justify-between">
                <span>▣ {menu.title}</span>
                <span>⌃</span>
              </div>

              {menu.items.map((item) => (
                <button
                  key={item}
                  onClick={() => handleMenu(item)}
                  className={`w-full text-left pl-8 pr-2 py-[8px] hover:bg-[#b7b7b7] transition ${
                    activePage === item ? "bg-[#b7b7b7]" : ""
                  }`}
                >
                  - {item}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-2">
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-sm font-bold"
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

      <section className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <header className="h-[52px] bg-white border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden bg-slate-900 text-white px-3 py-2 rounded-lg"
            >
              ☰
            </button>

            <div>
              <h1 className="text-[17px] font-black">Administration</h1>
              <p className="text-[11px] text-slate-500">Gestion des utilisateurs et accès</p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              setActivePage("Créer utilisateur");
              setForm({
                name: "",
                email: "",
                password: "",
                role: "SECRETAIRE",
                active: true,
              });
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold"
          >
            + Créer utilisateur
          </button>
        </header>

        <div className="flex-1 overflow-auto p-5">
          {activePage === "Dashboard admin" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card title="Utilisateurs" value={users.length} icon="👥" />
              <Card title="Actifs" value={users.filter((u) => u.active).length} icon="✅" />
              <Card title="Administrateurs" value={users.filter((u) => u.role === "ADMIN").length} icon="👑" />
            </div>
          )}

          {activePage === "Utilisateurs" && (
            <div className="bg-white rounded-2xl shadow border overflow-hidden">
              <div className="p-5 border-b flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black">Liste des utilisateurs</h2>
                  <p className="text-slate-500">Création, modification et suppression des comptes</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-3 text-left">Nom</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Rôle</th>
                      <th className="p-3 text-left">Statut</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="odd:bg-slate-50 hover:bg-blue-50">
                        <td className="p-3 border-b font-bold">{u.name}</td>
                        <td className="p-3 border-b">{u.email}</td>
                        <td className="p-3 border-b">
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold text-xs">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 border-b">
                          {u.active ? (
                            <span className="text-green-600 font-bold">Actif</span>
                          ) : (
                            <span className="text-red-600 font-bold">Bloqué</span>
                          )}
                        </td>
                        <td className="p-3 border-b text-center">
                          <button
                            onClick={() => editUser(u)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg mr-2"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}

                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-slate-500">
                          Aucun utilisateur
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activePage === "Créer utilisateur" && (
            <div className="max-w-3xl bg-white rounded-2xl shadow border p-6">
              <h2 className="text-2xl font-black mb-1">
                {editingId ? "Modifier utilisateur" : "Créer utilisateur"}
              </h2>
              <p className="text-slate-500 mb-6">
                Mamorona login sy mot de passe ho an’ny utilisateur.
              </p>

              <form onSubmit={saveUser} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Nom complet" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
                <Field label="Email login" type="email" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} />

                <Field
                  label={editingId ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
                  type="password"
                  value={form.password}
                  onChange={(v: string) => setForm({ ...form, password: v })}
                />

                <label>
                  <span className="text-slate-600 font-semibold">Rôle</span>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="DIRECTEUR">DIRECTEUR</option>
                    <option value="SECRETAIRE">SECRETAIRE</option>
                  </select>
                </label>

                <label className="md:col-span-2 flex items-center gap-3 bg-slate-50 p-4 rounded-xl border">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  <span className="font-semibold">Compte actif</span>
                </label>

                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-60"
                  >
                    {loading ? "Enregistrement..." : editingId ? "Enregistrer modification" : "Créer utilisateur"}
                  </button>

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
                    className="bg-slate-200 hover:bg-slate-300 px-5 py-3 rounded-xl font-bold"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {!["Dashboard admin", "Utilisateurs", "Créer utilisateur"].includes(activePage) && (
            <div className="bg-white rounded-2xl shadow border p-8 text-center">
              <h2 className="text-2xl font-black">{activePage}</h2>
              <p className="text-slate-500 mt-2">Page bientôt disponible.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Card({ title, value, icon }: any) {
  return (
    <div className="bg-white rounded-2xl shadow border p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <p className="text-slate-500">{title}</p>
      <h3 className="text-3xl font-black">{value}</h3>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: any) {
  return (
    <label>
      <span className="text-slate-600 font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}