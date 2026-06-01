"use client";

import { useEffect, useMemo, useState } from "react";

type RoleItem = {
  id: number;
  name: string;
  label: string;
  description?: string | null;
  active: boolean;
};

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  roleId?: number | null;
  roleRef?: RoleItem | null;
  roleLabel?: string | null;
  active: boolean;
};

const menus = [
  {
    title: "Tableau de bord",
    items: ["Dashboard admin", "Liste des étudiants", "Années scolaires", "Niveaux / Classes / Séries"],
  },
  {
    title: "Utilisateurs & accès",
    items: ["Utilisateurs", "Créer utilisateur", "Rôles utilisateurs"],
  },
  {
    title: "Paramètres",
    items: ["Paramètres généraux", "Journal d’activités"],
  },
];

function normalizeRoleName(value: string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("Utilisateurs");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SECRETAIRE",
    roleId: "",
    active: true,
  });

  const [roleForm, setRoleForm] = useState({
    name: "",
    label: "",
    description: "",
    active: true,
  });

  const activeRoles = useMemo(() => roles.filter((role) => role.active), [roles]);

  async function loadUsers() {
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : Array.isArray(data.users) ? data.users : []);
  }

  async function loadRoles() {
    try {
      const res = await fetch("/api/roles", { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data.roles) ? data.roles : [];
      setRoles(list);

      const defaultRole = list.find((role: RoleItem) => role.name === "SECRETAIRE") || list[0];
      if (defaultRole) {
        setForm((prev) => ({
          ...prev,
          role: prev.role || defaultRole.name,
          roleId: prev.roleId || String(defaultRole.id),
        }));
      }
    } catch {
      setRoles([]);
    }
  }

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  function getRoleByUser(user: User) {
    return (
      user.roleRef ||
      roles.find((role) => Number(role.id) === Number(user.roleId)) ||
      roles.find((role) => role.name === user.role) ||
      null
    );
  }

  function getRoleDisplay(user: User) {
    const role = getRoleByUser(user);
    return user.roleLabel || role?.label || user.role || "SECRETAIRE";
  }

  function isAdminUser(user: User) {
    const role = getRoleByUser(user);
    return user.role === "ADMIN" || role?.name === "ADMIN";
  }

  function resetUserForm() {
    const defaultRole = activeRoles.find((role) => role.name === "SECRETAIRE") || activeRoles[0];

    setEditingId(null);
    setForm({
      name: "",
      email: "",
      password: "",
      role: defaultRole?.name || "SECRETAIRE",
      roleId: defaultRole ? String(defaultRole.id) : "",
      active: true,
    });
  }

  function resetRoleForm() {
    setEditingRoleId(null);
    setRoleForm({
      name: "",
      label: "",
      description: "",
      active: true,
    });
  }

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

    const selectedRole =
      roles.find((role) => String(role.id) === String(form.roleId)) ||
      roles.find((role) => role.name === form.role);

    const payload = {
      ...form,
      roleId: selectedRole ? selectedRole.id : form.roleId ? Number(form.roleId) : null,
      role: selectedRole?.name || form.role || "SECRETAIRE",
    };

    setLoading(true);

    const res = await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "Erreur utilisateur");
      return;
    }

    resetUserForm();
    setActivePage("Utilisateurs");
    loadUsers();
  }

  function editUser(user: User) {
    const role = getRoleByUser(user);

    setEditingId(user.id);
    setActivePage("Créer utilisateur");
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: role?.name || user.role || "SECRETAIRE",
      roleId: role ? String(role.id) : user.roleId ? String(user.roleId) : "",
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

  async function saveRole(e: React.FormEvent) {
    e.preventDefault();

    const name = normalizeRoleName(roleForm.name || roleForm.label);
    const label = String(roleForm.label || "").trim();

    if (!name || !label) {
      alert("Nom technique sy libellé obligatoire");
      return;
    }

    const payload = {
      name,
      label,
      description: roleForm.description,
      active: roleForm.active,
    };

    setRoleLoading(true);

    const res = await fetch(editingRoleId ? `/api/roles/${editingRoleId}` : "/api/roles", {
      method: editingRoleId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setRoleLoading(false);

    if (!res.ok) {
      alert(data.error || "Erreur rôle");
      return;
    }

    resetRoleForm();
    loadRoles();
  }

  function editRole(role: RoleItem) {
    setEditingRoleId(role.id);
    setRoleForm({
      name: role.name,
      label: role.label,
      description: role.description || "",
      active: role.active,
    });
  }

  async function toggleRole(role: RoleItem) {
    const protectedRoles = ["ADMIN", "DIRECTEUR", "SECRETAIRE"];
    if (protectedRoles.includes(role.name) && role.active) {
      if (!confirm(`Le rôle ${role.name} est un rôle système. Voulez-vous vraiment le désactiver ?`)) {
        return;
      }
    }

    const res = await fetch(`/api/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !role.active }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erreur modification rôle");
      return;
    }

    loadRoles();
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
              <p className="text-[11px] text-slate-500">Gestion des utilisateurs, rôles et accès</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                resetRoleForm();
                setActivePage("Rôles utilisateurs");
              }}
              className="hidden sm:block bg-slate-800 hover:bg-black text-white px-4 py-2 rounded-xl font-bold"
            >
              ⚙ Rôles
            </button>

            <button
              onClick={() => {
                resetUserForm();
                setActivePage("Créer utilisateur");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold"
            >
              + Créer utilisateur
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5">
          {activePage === "Dashboard admin" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card title="Utilisateurs" value={users.length} icon="👥" />
              <Card title="Actifs" value={users.filter((u) => u.active).length} icon="✅" />
              <Card title="Administrateurs" value={users.filter(isAdminUser).length} icon="👑" />
              <Card title="Rôles" value={roles.length} icon="🛡️" />
            </div>
          )}

          {activePage === "Utilisateurs" && (
            <div className="bg-white rounded-2xl shadow border overflow-hidden">
              <div className="p-5 border-b flex flex-wrap gap-3 justify-between items-center">
                <div>
                  <h2 className="text-xl font-black">Liste des utilisateurs</h2>
                  <p className="text-slate-500">Création, modification et suppression des comptes</p>
                </div>

                <button
                  onClick={() => {
                    resetRoleForm();
                    setActivePage("Rôles utilisateurs");
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold hover:bg-slate-50"
                >
                  Gérer les rôles
                </button>
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
                            {getRoleDisplay(u)}
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
                    value={form.roleId}
                    onChange={(e) => {
                      const selectedRole = roles.find((role) => String(role.id) === e.target.value);
                      setForm({
                        ...form,
                        roleId: e.target.value,
                        role: selectedRole?.name || form.role,
                      });
                    }}
                    className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choisir un rôle --</option>
                    {activeRoles.map((role) => (
                      <option key={role.id} value={String(role.id)}>
                        {role.label} ({role.name})
                      </option>
                    ))}
                  </select>

                  {activeRoles.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePage("Rôles utilisateurs")}
                      className="mt-2 text-blue-600 font-bold underline"
                    >
                      Créer les rôles utilisateurs
                    </button>
                  )}
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
                    onClick={resetUserForm}
                    className="bg-slate-200 hover:bg-slate-300 px-5 py-3 rounded-xl font-bold"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {activePage === "Rôles utilisateurs" && (
            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">
              <div className="bg-white rounded-2xl shadow border p-6">
                <h2 className="text-2xl font-black mb-1">
                  {editingRoleId ? "Modifier rôle" : "Créer rôle"}
                </h2>
                <p className="text-slate-500 mb-6">
                  Admin afaka mamorona rôle personnalisé: Administration, Comptable, Caissier, Surveillant...
                </p>

                <form onSubmit={saveRole} className="grid gap-4">
                  <Field
                    label="Nom technique"
                    value={roleForm.name}
                    onChange={(v: string) => {
                      const name = normalizeRoleName(v);
                      setRoleForm({ ...roleForm, name });
                    }}
                  />

                  <Field
                    label="Libellé affiché"
                    value={roleForm.label}
                    onChange={(v: string) => {
                      setRoleForm((prev) => ({
                        ...prev,
                        label: v,
                        name: prev.name || normalizeRoleName(v),
                      }));
                    }}
                  />

                  <label>
                    <span className="text-slate-600 font-semibold">Description</span>
                    <textarea
                      value={roleForm.description}
                      onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                      rows={4}
                      className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border">
                    <input
                      type="checkbox"
                      checked={roleForm.active}
                      onChange={(e) => setRoleForm({ ...roleForm, active: e.target.checked })}
                    />
                    <span className="font-semibold">Rôle actif</span>
                  </label>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={roleLoading}
                      className="bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-xl font-bold disabled:opacity-60"
                    >
                      {roleLoading ? "Enregistrement..." : editingRoleId ? "Modifier rôle" : "Créer rôle"}
                    </button>

                    <button
                      type="button"
                      onClick={resetRoleForm}
                      className="bg-slate-200 hover:bg-slate-300 px-5 py-3 rounded-xl font-bold"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-2xl shadow border overflow-hidden">
                <div className="p-5 border-b">
                  <h2 className="text-xl font-black">Liste des rôles</h2>
                  <p className="text-slate-500">
                    Les rôles actifs sont disponibles dans le formulaire utilisateur.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="p-3 text-left">Nom</th>
                        <th className="p-3 text-left">Libellé</th>
                        <th className="p-3 text-left">Description</th>
                        <th className="p-3 text-left">Statut</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roles.map((role) => (
                        <tr key={role.id} className="odd:bg-slate-50 hover:bg-blue-50">
                          <td className="p-3 border-b font-black">{role.name}</td>
                          <td className="p-3 border-b">{role.label}</td>
                          <td className="p-3 border-b">{role.description || "-"}</td>
                          <td className="p-3 border-b">
                            {role.active ? (
                              <span className="text-green-600 font-bold">Actif</span>
                            ) : (
                              <span className="text-red-600 font-bold">Inactif</span>
                            )}
                          </td>
                          <td className="p-3 border-b text-center">
                            <button
                              onClick={() => editRole(role)}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg mr-2"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => toggleRole(role)}
                              className={`text-white px-3 py-2 rounded-lg ${
                                role.active
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-green-600 hover:bg-green-700"
                              }`}
                            >
                              {role.active ? "Désactiver" : "Activer"}
                            </button>
                          </td>
                        </tr>
                      ))}

                      {roles.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center p-8 text-slate-500">
                            Aucun rôle. Créez ADMIN, DIRECTEUR, SECRETAIRE et vos rôles personnalisés.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!["Dashboard admin", "Utilisateurs", "Créer utilisateur", "Rôles utilisateurs"].includes(activePage) && (
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
