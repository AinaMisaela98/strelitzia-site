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
  profilePhoto?: string | null;
  mustChangePassword?: boolean;
};

const menus = [
  {
    title: "Tableau de bord",
    items: [
      "Dashboard admin",
      "Recette prévisionnel",
      "Matériel",
      "Dépenses prévisionnel",
      "CA prévisionnel",
    ],
  },
  {
    title: "Utilisateurs & accès",
    items: ["Utilisateurs", "Créer utilisateur", "Rôles utilisateurs"],
  },
  {
    title: "Étudiants",
    items: [
      "Liste des inscrits",
      "Inscrire un étudiant",
      "Réinscription",
      "Information étudiant",
    ],
  },
  {
    title: "Frais & paiements",
    items: [
      "Modèles de frais",
      "Frais de formation",
      "Paiement",
      "État paiement des frais",
      "État paiement des activités",
    ],
  },
  {
    title: "Académique",
    items: ["Années scolaires", "Niveaux / Classes / Séries"],
  },
  {
    title: "Liste Trésorerie",
    items: ["Trésorerie", "Mouvements de Trésorerie"],
  },
  {
    title: "Activité extras",
    items: [
      "Favoris",
      "Forfait activité extras",
      "Inscription activité extras",
    ],
  },
  {
    title: "Parents",
    items: ["Liste des parents"],
  },
  {
    title: "Accessoire",
    items: ["Liste des accessoires", "Liste des commandes"],
  },
  {
    title: "Paramètres",
    items: ["Thème", "Paramètres généraux", "Journal d’activités"],
  },
];

const internalAdminPages = new Set([
  "Dashboard admin",
  "Utilisateurs",
  "Créer utilisateur",
  "Rôles utilisateurs",
]);

const adminOptionRoutes: Record<string, string> = {
  // ETUDIANTS
  "Liste des inscrits": "/admin/student",
  "Inscrire un étudiant": "/admin/inscription",
  "Réinscription": "/user/reinscription",
  "Information étudiant": "/user/student",

  // FRAIS
  "Modèles de frais": "/user/fee-models",
  "Frais de formation": "/user/training-fees",
  "Paiement": "/user/payments",
  "État paiement des frais": "/user/fee-payment-status",

  // ACADEMIQUE
  "Années scolaires": "/user/school-years",
  "Niveaux / Classes / Séries": "/user/academics",

  // TRESORERIE
  "Trésorerie": "/user/treasuries",
  "Mouvements de Trésorerie": "/user/treasury-movements",

  // PARAMETRES
  "Thème": "/user/settings",
  "Paramètres généraux": "/user/settings",
};


const notReadyAdminOptions = new Set([
  "Recette prévisionnel",
  "Matériel",
  "Dépenses prévisionnel",
  "CA prévisionnel",
  "État paiement des activités",
  "Favoris",
  "Forfait activité extras",
  "Inscription activité extras",
  "Liste des parents",
  "Liste des accessoires",
  "Liste des commandes",
  "Journal d’activités",
]);

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
  if (item.includes("Dashboard") || item.includes("prévisionnel")) return "⌂";
  if (item.includes("Matériel")) return "🧰";
  if (item.includes("Utilisateurs")) return "👥";
  if (item.includes("Créer")) return "+";
  if (item.includes("Rôles")) return "🛡";
  if (item.includes("Années")) return "📅";
  if (item.includes("Niveaux")) return "▦";
  if (item.includes("Modèles")) return "▣";
  if (item.includes("Paiement") || item.includes("frais")) return "💳";
  if (item.includes("inscrits")) return "🎒";
  if (item.includes("Inscrire")) return "✚";
  if (item.includes("Réinscription")) return "↻";
  if (item.includes("Trésorer")) return "🏦";
  if (item.includes("Mouvements")) return "⇄";
  if (item.includes("Favoris")) return "★";
  if (item.includes("activité")) return "🎯";
  if (item.includes("parents")) return "👪";
  if (item.includes("accessoires") || item.includes("commandes")) return "🛍";
  if (item.includes("Thème") || item.includes("Paramètres")) return "⚙";
  if (item.includes("Journal")) return "☷";
  return "•";
}

function roleBadgeClass(label: string) {
  const normalized = normalizeRoleName(label);
  if (normalized.includes("ADMIN"))
    return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20";
  if (normalized.includes("DIRECTEUR"))
    return "bg-violet-500/15 text-violet-300 ring-violet-500/20";
  if (normalized.includes("SECRETAIRE"))
    return "bg-blue-500/15 text-blue-300 ring-blue-500/20";
  if (normalized.includes("COMPT") || normalized.includes("CAISS"))
    return "bg-amber-500/15 text-amber-300 ring-amber-500/20";
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
  const [uploadingPhotoUserId, setUploadingPhotoUserId] = useState<number | null>(null);
  const [openActionUserId, setOpenActionUserId] = useState<number | null>(null);
  const [showPasswordPreview, setShowPasswordPreview] = useState(false);

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

  const activeRoles = useMemo(
    () => roles.filter((role) => role.active),
    [roles],
  );

  const adminHeaderUser = useMemo(() => {
    const adminList = users
      .filter((user) => {
        const normalizedRole = normalizeRoleName(
          user.roleRef?.name || user.role || user.roleLabel || "",
        );
        return normalizedRole.includes("ADMIN");
      })
      .sort((a, b) => Number(a.id) - Number(b.id));

    return adminList[0] || null;
  }, [users]);

  async function loadUsers() {
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = await res.json();
    setUsers(
      Array.isArray(data) ? data : Array.isArray(data.users) ? data.users : [],
    );
  }

  async function loadRoles() {
    try {
      const res = await fetch("/api/roles", { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.roles)
          ? data.roles
          : [];
      setRoles(list);

      const defaultRole =
        list.find((role: RoleItem) => role.name === "SECRETAIRE") || list[0];
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

    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && internalAdminPages.has(tab)) {
      setActivePage(tab);
    }
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

  function isPrincipalAdmin(user: User) {
    return Boolean(adminHeaderUser && Number(adminHeaderUser.id) === Number(user.id));
  }

  function resetUserForm() {
    const defaultRole =
      activeRoles.find((role) => role.name === "SECRETAIRE") || activeRoles[0];

    setEditingId(null);
    setShowPasswordPreview(false);
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

  function openInternalAdminPage(item: string) {
    setActivePage(item);
    setSidebarOpen(false);

    const url = new URL(window.location.href);
    url.pathname = "/admin";
    url.searchParams.set("tab", item);
    window.history.pushState({}, "", url.toString());
  }

  function goToRoute(route: string) {
    setSidebarOpen(false);
    window.location.href = `${route}${route.includes("?") ? "&" : "?"}_ts=${Date.now()}`;
  }

  function handleMenu(item: string) {
    if (internalAdminPages.has(item)) {
      openInternalAdminPage(item);
      return;
    }

    const route = adminOptionRoutes[item];
    if (route) {
      goToRoute(route);
      return;
    }

    if (notReadyAdminOptions.has(item)) {
      setSidebarOpen(false);
      openInternalAdminPage("Dashboard admin");
      alert(`Module "${item}" mbola tsy misy page noforonina ao amin'ny projet. Tsy alefa amin'ny route tsy misy izy mba tsy hiteraka 404.`);
      return;
    }

    setSidebarOpen(false);
    openInternalAdminPage("Dashboard admin");
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
      roleId: selectedRole
        ? selectedRole.id
        : form.roleId
          ? Number(form.roleId)
          : null,
      role: selectedRole?.name || form.role || "SECRETAIRE",
    };

    setLoading(true);

    const res = await fetch(
      editingId ? `/api/users/${editingId}` : "/api/users",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "Erreur utilisateur");
      return;
    }

    resetUserForm();
    setShowPasswordPreview(false);
    openInternalAdminPage("Utilisateurs");
    loadUsers();
  }

  function editUser(user: User) {
    const role = getRoleByUser(user);

    setEditingId(user.id);
    setShowPasswordPreview(false);
    openInternalAdminPage("Créer utilisateur");
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

    if (isPrincipalAdmin(user)) {
      alert(
        "Impossible de supprimer l’ADMIN principal pour protéger l’accès au système.",
      );
      return;
    }

    if (
      !confirm(
        `Voulez-vous vraiment supprimer l’utilisateur ${user.name} (${roleDisplay}) ?`,
      )
    )
      return;

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


  function userInitials(user: User) {
    const rawName = String(user.name || user.email || "U").trim();
    const parts = rawName.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const second = parts.length > 1 ? parts[1]?.[0] || "" : "";
    return `${first}${second}`.toUpperCase();
  }

  function profilePhotoSrc(user: User) {
    const photo = String(user.profilePhoto || "").trim();
    return photo || "";
  }

  async function uploadProfilePhoto(user: User, file?: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Veuillez choisir une image valide.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("Photo trop lourde. Maximum 3 Mo.");
      return;
    }

    try {
      setUploadingPhotoUserId(user.id);

      const formData = new FormData();
      formData.append("photo", file);
      formData.append("userId", String(user.id));

      const res = await fetch("/api/admin/users/profile-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Erreur upload photo profil");
        return;
      }

      const nextPhoto =
        data.profilePhoto ||
        data.profilePhotoUrl ||
        data.url ||
        data.user?.profilePhoto ||
        "";

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id
            ? {
                ...item,
                profilePhoto: nextPhoto || item.profilePhoto,
              }
            : item,
        ),
      );

      await loadUsers();
    } catch {
      alert("Erreur réseau pendant l’upload photo profil");
    } finally {
      setUploadingPhotoUserId(null);
    }
  }

  async function removeProfilePhoto(user: User) {
    if (!profilePhotoSrc(user)) return;

    if (!confirm(`Supprimer la photo de profil de ${user.name} ?`)) return;

    try {
      setUploadingPhotoUserId(user.id);

      const formData = new FormData();
      formData.append("userId", String(user.id));
      formData.append("action", "delete");

      const res = await fetch("/api/admin/users/profile-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Erreur suppression photo profil");
        return;
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, profilePhoto: null } : item,
        ),
      );

      await loadUsers();
    } catch {
      alert("Erreur réseau pendant la suppression photo profil");
    } finally {
      setUploadingPhotoUserId(null);
    }
  }

  async function toggleUserStatus(user: User) {
    if (isAdminUser(user)) {
      alert("Le compte ADMIN reste protégé pour éviter de bloquer l’accès au système.");
      return;
    }

    const nextActive = !user.active;
    const actionLabel = nextActive ? "activer" : "désactiver";

    if (!confirm(`Voulez-vous vraiment ${actionLabel} le compte de ${user.name} ?`)) {
      return;
    }

    try {
      setLoading(true);

      const role = getRoleByUser(user);
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: role?.name || user.role || "SECRETAIRE",
          roleId: role?.id || user.roleId || null,
          active: nextActive,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Erreur modification statut utilisateur");
        return;
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, active: nextActive } : item,
        ),
      );

      await loadUsers();
    } catch {
      alert("Erreur réseau pendant la modification du statut utilisateur");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(user: User) {
    if (
      !confirm(
        `Réinitialiser le mot de passe de ${user.name} à 123456 ?`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Erreur réinitialisation mot de passe");
        return;
      }

      alert(data.message || "Mot de passe réinitialisé : 123456");

      await loadUsers();
    } catch {
      alert("Erreur réseau pendant la réinitialisation mot de passe");
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

    const res = await fetch(
      editingRoleId ? `/api/roles/${editingRoleId}` : "/api/roles",
      {
        method: editingRoleId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

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
      if (
        !confirm(
          `Le rôle ${role.name} est un rôle système. Voulez-vous vraiment le désactiver ?`,
        )
      ) {
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
    <main className="fixed inset-0 flex overflow-hidden bg-[#07101d] text-[12px] text-slate-100 sm:text-[13px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_32%)]" />

      <button
        type="button"
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
        className="fixed left-3 top-3 z-[70] flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-[#0b1626]/95 text-xl font-black text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition active:scale-95 sm:left-4 sm:top-4 sm:h-11 sm:w-11 lg:hidden"
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      <aside
        className={`fixed lg:relative z-50 flex h-full shrink-0 flex-col border-r border-white/10 bg-[#08111f]/95 text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarCollapsed ? "lg:w-[86px]" : "lg:w-[280px]"}
          w-[280px]`}
      >
        <div
          className={`flex h-[76px] items-center border-b border-white/10 transition-all duration-300 ${sidebarCollapsed ? "lg:justify-center lg:px-3" : "gap-3 px-6"}`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-red-600 text-xl shadow-lg shadow-red-900/30">
            ✿
          </div>
          <div
            className={`min-w-0 overflow-hidden leading-none transition-all duration-300 ${sidebarCollapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"}`}
          >
            <div className="whitespace-nowrap text-[21px] font-black tracking-wide text-white">
              STRELITZIA
            </div>
            <div className="mt-1 whitespace-nowrap text-[16px] font-black tracking-wide text-red-500">
              SCHOOL
            </div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30">
          {menus.map((menu) => (
            <div key={menu.title} className="mb-4">
              <div
                className={`mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all duration-300 ${sidebarCollapsed ? "lg:h-0 lg:overflow-hidden lg:opacity-0" : "opacity-100"}`}
              >
                {menu.title}
              </div>

              <div className="space-y-1">
                {menu.items.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleMenu(item)}
                    title={item}
                    className={`group relative flex w-full items-center rounded-xl py-3 text-left font-semibold transition ${
                      sidebarCollapsed
                        ? "lg:justify-center lg:gap-0 lg:px-2"
                        : "gap-3 px-4"
                    } ${
                      activePage === item
                        ? "bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg shadow-red-950/30"
                        : "text-slate-300 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-[15px]">
                      {menuIcon(item)}
                    </span>
                    <span
                      className={`min-w-0 whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "lg:w-0 lg:overflow-hidden lg:opacity-0" : "w-auto opacity-100"}`}
                    >
                      {item}
                    </span>
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

        <div
          className={`shrink-0 space-y-3 border-t border-white/10 bg-[#08111f]/95 p-4 transition-all duration-300 ${sidebarCollapsed ? "lg:px-3" : ""}`}
        >
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3 shadow-xl shadow-black/20">
            <div
              className={`flex items-center transition-all duration-300 ${sidebarCollapsed ? "lg:justify-center lg:gap-0" : "gap-3"}`}
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-700 ring-2 ring-red-500/40">
                {adminHeaderUser && profilePhotoSrc(adminHeaderUser) ? (
                  <img
                    src={profilePhotoSrc(adminHeaderUser)}
                    alt="Admin Strelitzia"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-700 to-slate-900 text-sm font-black text-white">
                    AD
                  </div>
                )}
              </div>
              <div
                className={`min-w-0 flex-1 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "lg:w-0 lg:flex-none lg:opacity-0" : "opacity-100"}`}
              >
                <p className="truncate font-black">{adminHeaderUser?.name || "Administrateur"}</p>
                <p className="text-[12px] text-slate-400">Admin Strelitzia</p>
              </div>
              <span
                className={`text-slate-400 transition-all duration-300 ${sidebarCollapsed ? "lg:hidden" : ""}`}
              >
                ⌄
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Déconnexion"
            className={`flex w-full items-center rounded-xl border border-white/10 bg-white/[0.05] py-4 font-bold text-white transition hover:bg-red-600 ${sidebarCollapsed ? "lg:justify-center lg:px-2" : "gap-3 px-4"}`}
          >
            <span className="text-lg">⇥</span>
            <span
              className={`whitespace-nowrap transition-all duration-300 ${sidebarCollapsed ? "lg:w-0 lg:overflow-hidden lg:opacity-0" : "opacity-100"}`}
            >
              Déconnexion
            </span>
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
        <header className="flex h-[64px] shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#08111f]/60 px-3 backdrop-blur-xl sm:h-[76px] sm:px-5 lg:px-9">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
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
              aria-label={
                sidebarCollapsed ? "Ouvrir la sidebar" : "Fermer la sidebar"
              }
              className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-2xl text-slate-200 transition hover:bg-white/10 active:scale-95 lg:block"
              title={
                sidebarCollapsed ? "Ouvrir la sidebar" : "Fermer la sidebar"
              }
            >
              {sidebarCollapsed ? "☰" : "✕"}
            </button>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              onClick={() => handleMenu("Favoris")}
              title="Favoris"
              className="relative rounded-xl p-2 text-xl text-slate-200 hover:bg-white/10"
            >
              ♡
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#08111f]" />
            </button>
            <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 sm:flex">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-700 ring-2 ring-red-500/40">
                {adminHeaderUser && profilePhotoSrc(adminHeaderUser) ? (
                  <img
                    src={profilePhotoSrc(adminHeaderUser)}
                    alt="Admin Strelitzia"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-700 to-slate-900 text-xs font-black text-white">
                    AD
                  </div>
                )}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate font-black text-white">{adminHeaderUser?.name || "Admin Strelitzia"}</p>
                <p className="text-[11px] font-bold text-slate-400">Admin Strelitzia</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="hidden rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 font-black text-red-200 transition hover:bg-red-600 hover:text-white md:block"
            >
              ⇥ Déconnexion
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-3 py-4 sm:p-5 lg:p-8">
          <div className="mb-5 sm:mb-8">
            <h1 className="break-words text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
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
            <p className="mt-2 break-words text-sm text-slate-400 sm:mt-3 sm:text-base">
              Accueil <span className="mx-2 text-slate-600">›</span>{" "}
              {activePage}
            </p>
          </div>

          {activePage === "Dashboard admin" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
              <Card title="Utilisateurs" value={users.length} icon="👥" />
              <Card
                title="Actifs"
                value={users.filter((u) => u.active).length}
                icon="✅"
              />
              <Card
                title="Administrateurs"
                value={users.filter(isAdminUser).length}
                icon="👑"
              />
              <Card title="Rôles" value={roles.length} icon="🛡️" />
            </div>
          )}

          {activePage === "Utilisateurs" && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-4 lg:p-7">
              <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-white sm:text-2xl">
                    Liste des utilisateurs
                  </h2>
                  <p className="mt-1 text-slate-400">
                    Création, modification et suppression des comptes
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3">
                  <button
                    onClick={() => {
                      resetRoleForm();
                      openInternalAdminPage("Rôles utilisateurs");
                    }}
                    className="w-full rounded-xl border border-white/10 px-4 py-3 font-bold text-slate-200 transition hover:bg-white/10 sm:w-auto"
                  >
                    ⚙ Rôles
                  </button>

                  <button
                    onClick={() => {
                      resetUserForm();
                      openInternalAdminPage("Créer utilisateur");
                    }}
                    className="w-full rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-5 py-3 font-black text-white shadow-lg shadow-red-950/30 transition hover:from-red-600 hover:to-red-500 sm:w-auto"
                  >
                    ⊕ Ajouter
                  </button>
                </div>
              </div>

              <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
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
                        <tr
                          key={u.id}
                          className="border-t border-white/10 transition hover:bg-white/[0.04]"
                        >
                          <td className="p-4 font-bold text-white">
                            <div className="flex items-center gap-3">
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-700 ring-2 ring-white/10">
                                {profilePhotoSrc(u) ? (
                                  <img
                                    src={profilePhotoSrc(u)}
                                    alt={`Profil ${u.name}`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">
                                    {userInitials(u)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="block truncate">{u.name}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-slate-200">{u.email}</td>
                          <td className="p-4">
                            <span
                              className={`rounded-lg px-3 py-1.5 font-bold ring-1 ${roleBadgeClass(roleDisplay)}`}
                            >
                              {roleDisplay}
                            </span>
                          </td>
                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() => toggleUserStatus(u)}
                              disabled={isAdminUser(u) || loading}
                              title={
                                isAdminUser(u)
                                  ? "Compte ADMIN protégé"
                                  : u.active
                                    ? "Cliquer pour désactiver"
                                    : "Cliquer pour activer"
                              }
                              className={
                                u.active
                                  ? "rounded-lg bg-emerald-500/15 px-3 py-1.5 font-bold text-emerald-300 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                  : "rounded-lg bg-red-500/15 px-3 py-1.5 font-bold text-red-300 ring-1 ring-red-500/20 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                              }
                            >
                              {u.active ? "Actif" : "Désactivé"}
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenActionUserId(
                                    openActionUserId === u.id ? null : u.id,
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 font-black text-white shadow-lg shadow-black/20 transition hover:bg-white/[0.10] active:scale-95"
                              >
                                Actions
                                <span className="text-[10px] text-slate-300">▼</span>
                              </button>

                              {openActionUserId === u.id && (
                                <div className="absolute right-0 z-[80] mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1626] shadow-2xl shadow-black/50 ring-1 ring-black/20">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionUserId(null);
                                      editUser(u);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-slate-100 transition hover:bg-white/10"
                                  >
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">✎</span>
                                    Modifier
                                  </button>

                                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-left font-bold text-slate-100 transition hover:bg-white/10">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">📷</span>
                                    {uploadingPhotoUserId === u.id
                                      ? "Upload en cours..."
                                      : "Changer photo"}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={uploadingPhotoUserId === u.id}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        setOpenActionUserId(null);
                                        uploadProfilePhoto(u, file);
                                        e.currentTarget.value = "";
                                      }}
                                    />
                                  </label>

                                  {profilePhotoSrc(u) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionUserId(null);
                                        removeProfilePhoto(u);
                                      }}
                                      disabled={uploadingPhotoUserId === u.id}
                                      className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
                                    >
                                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15">🧹</span>
                                      Enlever photo
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionUserId(null);
                                      toggleUserStatus(u);
                                    }}
                                    disabled={isAdminUser(u) || loading}
                                    className={
                                      u.active
                                        ? "flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-orange-300 transition hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                        : "flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    }
                                  >
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                                      {u.active ? "⏸" : "▶"}
                                    </span>
                                    {u.active ? "Désactiver" : "Activer"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionUserId(null);
                                      resetPassword(u);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-amber-300 transition hover:bg-amber-500/10"
                                  >
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">🔑</span>
                                    Réinitialiser mot de passe
                                  </button>

                                  <div className="h-px bg-white/10" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionUserId(null);
                                      deleteUser(u);
                                    }}
                                    disabled={deletingUserId === u.id || isPrincipalAdmin(u)}
                                    title={
                                      isPrincipalAdmin(u)
                                        ? "ADMIN principal protégé"
                                        : "Supprimer utilisateur"
                                    }
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15">🗑</span>
                                    {deletingUserId === u.id
                                      ? "Suppression..."
                                      : "Supprimer utilisateur"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {users.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-10 text-center text-slate-400"
                        >
                          Aucun utilisateur
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {users.map((u) => {
                  const roleDisplay = getRoleDisplay(u);
                  return (
                    <div
                      key={u.id}
                      className="rounded-xl border border-white/10 bg-[#0b1626]/70 p-4 shadow-xl shadow-black/20"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-700 ring-2 ring-white/10">
                          {profilePhotoSrc(u) ? (
                            <img
                              src={profilePhotoSrc(u)}
                              alt={`Profil ${u.name}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">
                              {userInitials(u)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-black text-white">
                            {u.name}
                          </p>
                          <p className="mt-1 break-all text-[12px] text-slate-300">
                            {u.email}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ring-1 ${roleBadgeClass(roleDisplay)}`}
                            >
                              {roleDisplay}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleUserStatus(u)}
                              disabled={isAdminUser(u) || loading}
                              className={
                                u.active
                                  ? "rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[12px] font-bold text-emerald-300 ring-1 ring-emerald-500/20 disabled:opacity-60"
                                  : "rounded-lg bg-red-500/15 px-3 py-1.5 text-[12px] font-bold text-red-300 ring-1 ring-red-500/20 disabled:opacity-60"
                              }
                            >
                              {u.active ? "Actif" : "Désactivé"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionUserId(
                                openActionUserId === u.id ? null : u.id,
                              )
                            }
                            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 font-black text-white shadow-lg shadow-black/20 transition hover:bg-white/[0.10] active:scale-95"
                          >
                            <span>Actions utilisateur</span>
                            <span className="text-[10px] text-slate-300">▼</span>
                          </button>

                          {openActionUserId === u.id && (
                            <div className="absolute left-0 right-0 z-[80] mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1626] shadow-2xl shadow-black/50 ring-1 ring-black/20">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionUserId(null);
                                  editUser(u);
                                }}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-slate-100 transition hover:bg-white/10"
                              >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">✎</span>
                                Modifier
                              </button>

                              <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-left font-bold text-slate-100 transition hover:bg-white/10">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">📷</span>
                                {uploadingPhotoUserId === u.id
                                  ? "Upload en cours..."
                                  : "Changer photo"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingPhotoUserId === u.id}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    setOpenActionUserId(null);
                                    uploadProfilePhoto(u, file);
                                    e.currentTarget.value = "";
                                  }}
                                />
                              </label>

                              {profilePhotoSrc(u) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionUserId(null);
                                    removeProfilePhoto(u);
                                  }}
                                  disabled={uploadingPhotoUserId === u.id}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
                                >
                                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15">🧹</span>
                                  Enlever photo
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionUserId(null);
                                  toggleUserStatus(u);
                                }}
                                disabled={isAdminUser(u) || loading}
                                className={
                                  u.active
                                    ? "flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-orange-300 transition hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    : "flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                }
                              >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                                  {u.active ? "⏸" : "▶"}
                                </span>
                                {u.active ? "Désactiver" : "Activer"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionUserId(null);
                                  resetPassword(u);
                                }}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-amber-300 transition hover:bg-amber-500/10"
                              >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">🔑</span>
                                Réinitialiser mot de passe
                              </button>

                              <div className="h-px bg-white/10" />

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionUserId(null);
                                  deleteUser(u);
                                }}
                                disabled={deletingUserId === u.id || isPrincipalAdmin(u)}
                                title={
                                  isPrincipalAdmin(u)
                                    ? "ADMIN principal protégé"
                                    : "Supprimer utilisateur"
                                }
                                className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15">🗑</span>
                                {deletingUserId === u.id
                                  ? "Suppression..."
                                  : "Supprimer utilisateur"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {users.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-[#0b1626]/70 p-8 text-center text-slate-400">
                    Aucun utilisateur
                  </div>
                )}
              </div>
            </section>
          )}

          {activePage === "Créer utilisateur" && (
            <section className="w-full max-w-4xl rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6">
              <h2 className="text-2xl font-black text-white">
                {editingId ? "Modifier utilisateur" : "Créer utilisateur"}
              </h2>
              <p className="mb-6 mt-1 text-slate-400">
                Mamorona login sy mot de passe ho an’ny utilisateur.
              </p>

              <form
                onSubmit={saveUser}
                className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2"
              >
                <Field
                  label="Nom complet"
                  value={form.name}
                  onChange={(v: string) => setForm({ ...form, name: v })}
                />
                <Field
                  label="Email login"
                  type="email"
                  value={form.email}
                  onChange={(v: string) => setForm({ ...form, email: v })}
                />

                <label>
                  <span className="font-semibold text-slate-300">
                    {editingId
                      ? "Nouveau mot de passe (optionnel)"
                      : "Mot de passe"}
                  </span>

                  <div className="mt-2 flex overflow-hidden rounded-xl border border-white/10 bg-[#0b1626] focus-within:ring-2 focus-within:ring-red-600">
                    <input
                      type={showPasswordPreview ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={
                        editingId
                          ? "Laisser vide pour garder l’ancien mot de passe"
                          : "Saisir le mot de passe"
                      }
                      className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base text-white outline-none placeholder:text-slate-600 sm:text-[13px]"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPasswordPreview((value) => !value)}
                      className="border-l border-white/10 px-4 py-3 font-black text-slate-200 transition hover:bg-white/10"
                      title={
                        showPasswordPreview
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                    >
                      {showPasswordPreview ? "🙈" : "👁"}
                    </button>
                  </div>

                  <div
                    className={`mt-2 rounded-xl border px-4 py-3 text-[12px] ${
                      form.password
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-400/20 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    <p className="font-black">Aperçu avant enregistrement</p>
                    {form.password ? (
                      <p className="mt-1 break-all font-mono text-[13px] text-white">
                        {showPasswordPreview ? form.password : "•".repeat(Math.min(form.password.length, 18))}
                      </p>
                    ) : (
                      <p className="mt-1">
                        {editingId
                          ? "Aucun nouveau mot de passe saisi."
                          : "Mot de passe mbola tsy nosoratana."}
                      </p>
                    )}
                  </div>
                </label>

                <label>
                  <span className="font-semibold text-slate-300">Rôle</span>
                  <select
                    value={form.roleId}
                    onChange={(e) => {
                      const selectedRole = roles.find(
                        (role) => String(role.id) === e.target.value,
                      );
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
                    <button
                      type="button"
                      onClick={() =>
                        openInternalAdminPage("Rôles utilisateurs")
                      }
                      className="mt-2 font-bold text-blue-400 underline"
                    >
                      Créer les rôles utilisateurs
                    </button>
                  )}
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                  />
                  <span className="font-semibold text-slate-200">
                    Compte actif
                  </span>
                </label>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3 md:col-span-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-5 py-3 font-black text-white shadow-lg shadow-red-950/30 disabled:opacity-60"
                  >
                    {loading
                      ? "Enregistrement..."
                      : editingId
                        ? "Enregistrer modification"
                        : "Créer utilisateur"}
                  </button>

                  <button
                    type="button"
                    onClick={resetUserForm}
                    className="rounded-xl border border-white/10 px-5 py-3 font-bold text-slate-200 hover:bg-white/10"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </section>
          )}

          {activePage === "Rôles utilisateurs" && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6">
                <h2 className="text-2xl font-black text-white">
                  {editingRoleId ? "Modifier rôle" : "Créer rôle"}
                </h2>
                <p className="mb-6 mt-1 text-slate-400">
                  Admin afaka mamorona rôle personnalisé: Administration,
                  Comptable, Caissier, Surveillant...
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
                    <span className="font-semibold text-slate-300">
                      Description
                    </span>
                    <textarea
                      value={roleForm.description}
                      onChange={(e) =>
                        setRoleForm({
                          ...roleForm,
                          description: e.target.value,
                        })
                      }
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1626] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <input
                      type="checkbox"
                      checked={roleForm.active}
                      onChange={(e) =>
                        setRoleForm({ ...roleForm, active: e.target.checked })
                      }
                    />
                    <span className="font-semibold text-slate-200">
                      Rôle actif
                    </span>
                  </label>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3">
                    <button
                      type="submit"
                      disabled={roleLoading}
                      className="rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-5 py-3 font-black text-white disabled:opacity-60"
                    >
                      {roleLoading
                        ? "Enregistrement..."
                        : editingRoleId
                          ? "Modifier rôle"
                          : "Créer rôle"}
                    </button>

                    <button
                      type="button"
                      onClick={resetRoleForm}
                      className="rounded-xl border border-white/10 px-5 py-3 font-bold text-slate-200 hover:bg-white/10"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </section>

              <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/25 backdrop-blur-xl">
                <div className="border-b border-white/10 p-5">
                  <h2 className="text-xl font-black text-white">
                    Liste des rôles
                  </h2>
                  <p className="text-slate-400">
                    Les rôles actifs sont disponibles dans le formulaire
                    utilisateur.
                  </p>
                </div>

                <div className="hidden overflow-x-auto md:block">
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
                        <tr
                          key={role.id}
                          className="border-t border-white/10 hover:bg-white/[0.04]"
                        >
                          <td className="p-4 font-black text-white">
                            {role.name}
                          </td>
                          <td className="p-4 text-slate-200">{role.label}</td>
                          <td className="p-4 text-slate-300">
                            {role.description || "-"}
                          </td>
                          <td className="p-4">
                            {role.active ? (
                              <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5 font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                                Actif
                              </span>
                            ) : (
                              <span className="rounded-lg bg-red-500/15 px-3 py-1.5 font-bold text-red-300 ring-1 ring-red-500/20">
                                Inactif
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => editRole(role)}
                              className="mr-3 font-bold text-blue-400 hover:text-blue-300"
                            >
                              ✎ Modifier
                            </button>
                            <button
                              onClick={() => toggleRole(role)}
                              className={
                                role.active
                                  ? "font-bold text-red-400 hover:text-red-300"
                                  : "font-bold text-emerald-400 hover:text-emerald-300"
                              }
                            >
                              {role.active ? "Désactiver" : "Activer"}
                            </button>
                          </td>
                        </tr>
                      ))}

                      {roles.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-10 text-center text-slate-400"
                          >
                            Aucun rôle. Créez ADMIN, DIRECTEUR, SECRETAIRE et
                            vos rôles personnalisés.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 p-3 md:hidden">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="rounded-xl border border-white/10 bg-[#0b1626]/70 p-4 shadow-xl shadow-black/20"
                    >
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="break-all font-black text-white">
                            {role.name}
                          </p>
                          <p className="mt-1 break-words text-slate-200">
                            {role.label}
                          </p>
                          <p className="mt-2 break-words text-[12px] text-slate-400">
                            {role.description || "-"}
                          </p>
                        </div>
                        <div>
                          {role.active ? (
                            <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[12px] font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                              Actif
                            </span>
                          ) : (
                            <span className="rounded-lg bg-red-500/15 px-3 py-1.5 text-[12px] font-bold text-red-300 ring-1 ring-red-500/20">
                              Inactif
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                        <button
                          onClick={() => editRole(role)}
                          className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 font-bold text-blue-300"
                        >
                          ✎ Modifier
                        </button>
                        <button
                          onClick={() => toggleRole(role)}
                          className={
                            role.active
                              ? "rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 font-bold text-red-300"
                              : "rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 font-bold text-emerald-300"
                          }
                        >
                          {role.active ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    </div>
                  ))}

                  {roles.length === 0 && (
                    <div className="rounded-xl border border-white/10 bg-[#0b1626]/70 p-8 text-center text-slate-400">
                      Aucun rôle. Créez ADMIN, DIRECTEUR, SECRETAIRE et vos
                      rôles personnalisés.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {!internalAdminPages.has(activePage) && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">
                    {activePage}
                  </h2>
                  <p className="mt-2 max-w-2xl text-slate-400">
                    Option tafiditra ato amin'ny Admin page. Raha mbola tsy misy
                    page dédiée amin'ity module ity ao amin'ny projet, tsy alefa
                    amin'ny route 404 izy fa aseho eto aloha mba tsy hiteraka
                    erreur.
                  </p>
                </div>
                {adminOptionRoutes[activePage] && (
                  <span className="w-fit rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-[11px] font-black text-amber-200">
                    Option UserDashboard
                  </span>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#0b1626]/70 p-4">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Statut
                  </p>
                  <p className="mt-2 font-bold text-white">
                    Menu ajouté dans l'administration
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1626]/70 p-4">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Navigation
                  </p>
                  <p className="mt-2 font-bold text-white">
                    Aucune redirection 404 forcée
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1626]/70 p-4 sm:col-span-2 xl:col-span-1">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Action
                  </p>
                  <p className="mt-2 font-bold text-white">
                    Prêt à relier à une vraie page dès que le route existe
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function Card({ title, value, icon }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
      <div className="mb-2 text-2xl sm:mb-3 sm:text-3xl">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
        {value}
      </h3>
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
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1626] px-4 py-3 text-base text-white outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-red-600 sm:text-[13px]"
      />
    </label>
  );
}
