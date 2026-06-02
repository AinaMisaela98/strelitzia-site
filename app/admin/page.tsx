"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

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
    items: ["Dashboard admin", "Liste des utilisateurs", "Années scolaires", "Niveaux / Classes / Séries"],
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

function menuIcon(item: string) {
  if (item.includes("Dashboard")) return "⌂";
  if (item.includes("utilisateur")) return "🎓";
  if (item.includes("Années")) return "📅";
  if (item.includes("Niveaux")) return "▦";
  if (item.includes("Utilisateurs")) return "👥";
  if (item.includes("Créer")) return "+";
  if (item.includes("Rôles")) return "🛡";
  if (item.includes("Paramètres")) return "⚙";
  if (item.includes("Journal")) return "☷";
  return "•";
}

function roleBadgeClass(label: string) {
  const normalized = normalizeRoleName(label);
  if (normalized.includes("ADMIN")) return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20";
  if (normalized.includes("DIRECTEUR")) return "bg-violet-500/15 text-violet-300 ring-violet-500/20";
  if (normalized.includes("SECRETAIRE")) return "bg-blue-500/15 text-blue-300 ring-blue-500/20";
  if (normalized.includes("COMPT") || normalized.includes("CAISS")) return "bg-amber-500/15 text-amber-300 ring-amber-500/20";
  return "bg-slate-400/15 text-slate-200 ring-slate-400/20";
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePage, setActivePage] = useState("Utilisateurs");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

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

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    window.addEventListener("keydown", closeWithEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [sidebarOpen]);

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
if (item === "Liste des utilisateurs") {
  window.location.href = `/user?_ts=${Date.now()}`;
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

  async function saveUser(e: FormEvent) {
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

  async function deleteUser(user: User) {
    const roleDisplay = getRoleDisplay(user);

    if (isAdminUser(user)) {
      alert("Impossible de supprimer un compte ADMIN pour protéger l’accès au système.");
      return;
    }

    if (!confirm(`Voulez-vous vraiment supprimer l’utilisateur ${user.name} (${roleDisplay}) ?`)) return;

    try {
      setDeletingUserId(user.id);

      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Erreur suppression utilisateur");
        return;
      }

      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      await loadUsers();
    } catch {
      alert("Erreur réseau pendant la suppression utilisateur");
    } finally {
      setDeletingUserId(null);
    }
  }

  async function saveRole(e: FormEvent) {
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
    try {
      const res = await fetch("/api/logout", { method: "POST" });
      if (!res.ok) {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
      }
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <main className="fixed inset-0 flex overflow-hidden bg-[#07101d] text-[13px] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_32%)]" />

      <button
        type="button"
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
        className="fixed left-4 top-4 z-[70] flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-[#0b1626]/95 text-xl font-black text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition active:scale-95 lg:hidden"
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      <aside
        className={`fixed lg:relative z-50 flex h-full shrink-0 flex-col border-r border-white/10 bg-[#08111f]/95 text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarCollapsed ? "lg:w-[86px]" : "lg:w-[280px]"}
          w-[280px]`}
      >
        <div className={`flex h-[76px] items-center border-b border-white/10 transition-all duration-300 ${sidebarCollapsed ? "lg:justify-center lg:px-3" : "gap-3 px-6"}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-red-600 text-xl shadow-lg shadow-red-900/30">
            ✿
          </div>
          <div className={`min-w-0 overflow-hidden leading-none transition-all duration-300 ${sidebarCollapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"}`}>
            <div className="whitespace-nowrap text-[21px] font-black tracking-wide text-white">STRELITZIA</div>
            <div className="mt-1 whitespace-nowrap text-[16px] font-black tracking-wide text-red-500">SCHOOL</div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30">
          {menus.map((menu) => (
            <div key={menu.title} className="mb-4">
              <div className={`mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all duration-300 ${sidebarCollapsed ? "lg:h-0 lg:overflow-hidden lg:opacity-0" : "opacity-100"}`}>
                {menu.title}
              </div>

              <div className="space-y-1">
                {menu.items.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleMenu(item)}
                    title={item}
                    className={`group relative flex w-full items-center rounded-xl py-3 text-left font-semibold transition ${
                      sidebarCollapsed ? "lg:justify-center lg:gap-0 lg:px-2" : "gap-3 px-4"
                    } ${
                      activePage === item
                        ? "bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg shadow-red-950/30"
                        : "text-slate-300 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-[15px]">{menuIcon(item)}</span>
                    <span className={`min-w-0 whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "lg:w-0 lg:overflow-hidden lg:opacity-0" : "w-auto opacity-100"}`}>{item}</span>
                    {sidebarCollapsed && (
                      <span className="pointer-events-none absolute left-full top-1/2 z-[80] ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-[#0b1626] px-3 py-2 text-xs font-bold text-white opacity-0 shadow-2xl shadow-black/40 transition group-hover:opacity-100 lg:block">
                        {item}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className={`shrink-0 space-y-3 border-t border-white/10 bg-[#08111f]/95 p-4 transition-all duration-300 ${sidebarCollapsed ? "lg:px-3" : ""}`}>
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3 shadow-xl shadow-black/20">
            <div className={`flex items-center transition-all duration-300 ${sidebarCollapsed ? "lg:justify-center lg:gap-0" : "gap-3"}`}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xl ring-2 ring-white/10">
                👑
              </div>
              <div className={`min-w-0 flex-1 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "lg:w-0 lg:flex-none lg:opacity-0" : "opacity-100"}`}>
                <p className="truncate font-black">Administrateur</p>
                <p className="text-[12px] text-slate-400">Admin Strelitzia</p>
              </div>
              <span className={`text-slate-400 transition-all duration-300 ${sidebarCollapsed ? "lg:hidden" : ""}`}>⌄</span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Déconnexion"
            className={`flex w-full items-center rounded-xl border border-white/10 bg-white/[0.05] py-4 font-bold text-white transition hover:bg-red-600 ${sidebarCollapsed ? "lg:justify-center lg:px-2" : "gap-3 px-4"}`}
          >
            <span className="text-lg">⇥</span>
            <span className={`whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "lg:w-0 lg:overflow-hidden lg:opacity-0" : "opacity-100"}`}>Déconnexion</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <section className="relative z-10 flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[76px] items-center justify-between border-b border-white/10 bg-[#08111f]/60 px-5 backdrop-blur-xl lg:px-9">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xl text-white transition active:scale-95 lg:hidden"
            >
              {sidebarOpen ? "✕" : "☰"}
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              aria-label={sidebarCollapsed ? "Ouvrir la sidebar" : "Fermer la sidebar"}
              className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-2xl text-slate-200 transition hover:bg-white/10 active:scale-95 lg:block"
              title={sidebarCollapsed ? "Ouvrir la sidebar" : "Fermer la sidebar"}
            >
              {sidebarCollapsed ? "☰" : "✕"}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative rounded-xl p-2 text-xl text-slate-200 hover:bg-white/10">
              ♡
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#08111f]" />
            </button>
            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 ring-2 ring-white/10">👑</div>
              <span className="font-bold">Admin Strelitzia</span>
            </div>
            <button
              onClick={logout}
              className="hidden rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 font-black text-red-200 transition hover:bg-red-600 hover:text-white md:block"
            >
              ⇥ Déconnexion
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-white lg:text-4xl">
              {activePage === "Créer utilisateur"
                ? editingId
                  ? "Modifier utilisateur"
                  : "Créer utilisateur"
                : activePage === "Rôles utilisateurs"
                ? "Gestion des rôles"
                : activePage === "Dashboard admin"
                ? "Dashboard admin"
                : "Gestion des utilisateurs"}
            </h1>
            <p className="mt-3 text-base text-slate-400">
              Accueil <span className="mx-2 text-slate-600">›</span> {activePage}
            </p>
          </div>

          {activePage === "Dashboard admin" && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
              <Card title="Utilisateurs" value={users.length} icon="👥" />
              <Card title="Actifs" value={users.filter((u) => u.active).length} icon="✅" />
              <Card title="Administrateurs" value={users.filter(isAdminUser).length} icon="👑" />
              <Card title="Rôles" value={roles.length} icon="🛡️" />
            </div>
          )}

          {activePage === "Utilisateurs" && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/25 backdrop-blur-xl lg:p-7">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">Liste des utilisateurs</h2>
                  <p className="mt-1 text-slate-400">Création, modification et suppression des comptes</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      resetRoleForm();
                      setActivePage("Rôles utilisateurs");
                    }}
                    className="rounded-xl border border-white/10 px-4 py-3 font-bold text-slate-200 transition hover:bg-white/10"
                  >
                    ⚙ Rôles
                  </button>

                  <button
                    onClick={() => {
                      resetUserForm();
                      setActivePage("Créer utilisateur");
                    }}
                    className="rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-5 py-3 font-black text-white shadow-lg shadow-red-950/30 transition hover:from-red-600 hover:to-red-500"
                  >
                    ⊕ Ajouter
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[850px] border-collapse">
                  <thead className="bg-white/[0.07] text-slate-100">
                    <tr>
                      <th className="p-4 text-left">Nom</th>
                      <th className="p-4 text-left">Email</th>
                      <th className="p-4 text-left">Rôle</th>
                      <th className="p-4 text-left">Statut</th>
                      <th className="p-4 text-left">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((u) => {
                      const roleDisplay = getRoleDisplay(u);
                      return (
                        <tr key={u.id} className="border-t border-white/10 transition hover:bg-white/[0.04]">
                          <td className="p-4 font-bold text-white">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm ring-2 ring-white/10">
                                {String(u.name || "U").slice(0, 1).toUpperCase()}
                              </div>
                              <span>{u.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-200">{u.email}</td>
                          <td className="p-4">
                            <span className={`rounded-lg px-3 py-1.5 font-bold ring-1 ${roleBadgeClass(roleDisplay)}`}>
                              {roleDisplay}
                            </span>
                          </td>
                          <td className="p-4">
                            {u.active ? (
                              <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5 font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                                Actif
                              </span>
                            ) : (
                              <span className="rounded-lg bg-red-500/15 px-3 py-1.5 font-bold text-red-300 ring-1 ring-red-500/20">
                                Bloqué
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-4">
                              <button onClick={() => editUser(u)} className="font-bold text-blue-400 hover:text-blue-300">
                                ✎ Modifier
                              </button>
                              <button
                                onClick={() => deleteUser(u)}
                                disabled={deletingUserId === u.id || isAdminUser(u)}
                                title={isAdminUser(u) ? "Compte ADMIN protégé" : "Supprimer utilisateur"}
                                className="font-bold text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {deletingUserId === u.id ? "Suppression..." : "🗑 Supprimer"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-slate-400">
                          Aucun utilisateur
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activePage === "Créer utilisateur" && (
            <section className="max-w-4xl rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/25 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-white">
                {editingId ? "Modifier utilisateur" : "Créer utilisateur"}
              </h2>
              <p className="mb-6 mt-1 text-slate-400">Mamorona login sy mot de passe ho an’ny utilisateur.</p>

              <form onSubmit={saveUser} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Nom complet" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
                <Field label="Email login" type="email" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} />

                <Field
                  label={editingId ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
                  type="password"
                  value={form.password}
                  onChange={(v: string) => setForm({ ...form, password: v })}
                />

                <label>
                  <span className="font-semibold text-slate-300">Rôle</span>
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
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1626] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <option value="">-- Choisir un rôle --</option>
                    {activeRoles.map((role) => (
                      <option key={role.id} value={String(role.id)}>
                        {role.label} ({role.name})
                      </option>
                    ))}
                  </select>

                  {activeRoles.length === 0 && (
                    <button type="button" onClick={() => setActivePage("Rôles utilisateurs")} className="mt-2 font-bold text-blue-400 underline">
                      Créer les rôles utilisateurs
                    </button>
                  )}
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 md:col-span-2">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  <span className="font-semibold text-slate-200">Compte actif</span>
                </label>

                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-5 py-3 font-black text-white shadow-lg shadow-red-950/30 disabled:opacity-60"
                  >
                    {loading ? "Enregistrement..." : editingId ? "Enregistrer modification" : "Créer utilisateur"}
                  </button>

                  <button type="button" onClick={resetUserForm} className="rounded-xl border border-white/10 px-5 py-3 font-bold text-slate-200 hover:bg-white/10">
                    Annuler
                  </button>
                </div>
              </form>
            </section>
          )}

          {activePage === "Rôles utilisateurs" && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/25 backdrop-blur-xl">
                <h2 className="text-2xl font-black text-white">{editingRoleId ? "Modifier rôle" : "Créer rôle"}</h2>
                <p className="mb-6 mt-1 text-slate-400">Admin afaka mamorona rôle personnalisé: Administration, Comptable, Caissier, Surveillant...</p>

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
                    <span className="font-semibold text-slate-300">Description</span>
                    <textarea
                      value={roleForm.description}
                      onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1626] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <input type="checkbox" checked={roleForm.active} onChange={(e) => setRoleForm({ ...roleForm, active: e.target.checked })} />
                    <span className="font-semibold text-slate-200">Rôle actif</span>
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button type="submit" disabled={roleLoading} className="rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-5 py-3 font-black text-white disabled:opacity-60">
                      {roleLoading ? "Enregistrement..." : editingRoleId ? "Modifier rôle" : "Créer rôle"}
                    </button>

                    <button type="button" onClick={resetRoleForm} className="rounded-xl border border-white/10 px-5 py-3 font-bold text-slate-200 hover:bg-white/10">
                      Annuler
                    </button>
                  </div>
                </form>
              </section>

              <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/25 backdrop-blur-xl">
                <div className="border-b border-white/10 p-5">
                  <h2 className="text-xl font-black text-white">Liste des rôles</h2>
                  <p className="text-slate-400">Les rôles actifs sont disponibles dans le formulaire utilisateur.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse">
                    <thead className="bg-white/[0.07] text-slate-100">
                      <tr>
                        <th className="p-4 text-left">Nom</th>
                        <th className="p-4 text-left">Libellé</th>
                        <th className="p-4 text-left">Description</th>
                        <th className="p-4 text-left">Statut</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roles.map((role) => (
                        <tr key={role.id} className="border-t border-white/10 hover:bg-white/[0.04]">
                          <td className="p-4 font-black text-white">{role.name}</td>
                          <td className="p-4 text-slate-200">{role.label}</td>
                          <td className="p-4 text-slate-300">{role.description || "-"}</td>
                          <td className="p-4">
                            {role.active ? (
                              <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5 font-bold text-emerald-300 ring-1 ring-emerald-500/20">Actif</span>
                            ) : (
                              <span className="rounded-lg bg-red-500/15 px-3 py-1.5 font-bold text-red-300 ring-1 ring-red-500/20">Inactif</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button onClick={() => editRole(role)} className="mr-3 font-bold text-blue-400 hover:text-blue-300">✎ Modifier</button>
                            <button onClick={() => toggleRole(role)} className={role.active ? "font-bold text-red-400 hover:text-red-300" : "font-bold text-emerald-400 hover:text-emerald-300"}>
                              {role.active ? "Désactiver" : "Activer"}
                            </button>
                          </td>
                        </tr>
                      ))}

                      {roles.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-slate-400">
                            Aucun rôle. Créez ADMIN, DIRECTEUR, SECRETAIRE et vos rôles personnalisés.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {!['Dashboard admin', 'Utilisateurs', 'Créer utilisateur', 'Rôles utilisateurs'].includes(activePage) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/25 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-white">{activePage}</h2>
              <p className="mt-2 text-slate-400">Page bientôt disponible.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Card({ title, value, icon }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-3 text-3xl">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h3 className="mt-2 text-3xl font-black text-white">{value}</h3>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: any) {
  return (
    <label>
      <span className="font-semibold text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1626] px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-red-600"
      />
    </label>
  );
}
