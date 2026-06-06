"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type AuthUser = {
  id?: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  roleLabel?: string | null;
  profilePhoto?: string | null;
  active?: boolean;
};

type MenuItem = {
  label: string;
  href?: string;
  icon?: string;
  action?: "theme" | "logout";
};

type MenuGroup = {
  title: string;
  icon: string;
  items: MenuItem[];
};

const SIDEBAR_COLLAPSED_KEY = "strelitzia-sidebar-collapsed";

const menuGroups: MenuGroup[] = [
  {
    title: "Tableau de bord",
    icon: "▣",
    items: [
      { label: "Accueil", href: "/user", icon: "⌂" },
      { label: "Recette prévisionnel", href: "/user/forecast-revenue", icon: "↗" },
      { label: "Matériel", href: "/user/materials", icon: "◈" },
      { label: "Dépenses prévisionnel", href: "/user/forecast-expenses", icon: "↘" },
      { label: "CA prévisionnel", href: "/user/forecast-turnover", icon: "◎" },
    ],
  },
  {
    title: "Étudiants",
    icon: "🎓",
    items: [
      { label: "Liste des inscrits", href: "/user", icon: "☷" },
      { label: "Inscrire un étudiant", href: "/user/inscription", icon: "+" },
      { label: "Réinscription", href: "/user/reinscription", icon: "↻" },
      { label: "Modèles de frais", href: "/user/fee-models", icon: "□" },
      { label: "Frais de formation", href: "/user/training-fees", icon: "◫" },
      { label: "Paiement", href: "/user/student-fees", icon: "₳" },
      { label: "État paiement des frais", href: "/user/fee-payment-status", icon: "✓" },
      { label: "État paiement des activités", href: "/user/activity-payment-status", icon: "◇" },
    ],
  },
  {
    title: "Académique",
    icon: "▦",
    items: [
      { label: "Années scolaires", href: "/user/school-years", icon: "◷" },
      { label: "Niveaux / Classes / Séries", href: "/user/academics", icon: "☰" },
    ],
  },
  {
    title: "Liste Trésorerie",
    icon: "💳",
    items: [
      { label: "Trésorerie", href: "/user/treasuries", icon: "▰" },
      { label: "Mouvements de Trésorerie", href: "/user/treasury-movements", icon: "⇄" },
    ],
  },
  {
    title: "Activité extras",
    icon: "★",
    items: [
      { label: "Favoris", href: "/user/favorites", icon: "☆" },
      { label: "Forfait activité extras", href: "/user/activity-packages", icon: "◫" },
      { label: "Inscription activité extras", href: "/user/activity-registrations", icon: "+" },
    ],
  },
  {
    title: "Parents",
    icon: "👥",
    items: [{ label: "Liste des parents", href: "/user/parents", icon: "☷" }],
  },
  {
    title: "Accessoire",
    icon: "◈",
    items: [
      { label: "Liste des accessoires", href: "/user/accessories", icon: "☷" },
      { label: "Liste des commandes", href: "/user/orders", icon: "☑" },
    ],
  },
  {
    title: "Paramètres",
    icon: "⚙",
    items: [
      { label: "Thème", action: "theme", icon: "◐" },
      { label: "Sites", href: "/user/sites", icon: "⌖" },
      { label: "Permissions", href: "/admin/permissions", icon: "🔐" },
    ],
  },
];

function getUserInitials(name?: string | null, email?: string | null) {
  const raw = String(name || email || "U").trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts.length > 1 ? parts[1]?.[0] || "" : "";
  return `${first}${second}`.toUpperCase();
}

function getRoleLabel(user: AuthUser | null) {
  return user?.roleLabel || user?.role || "Utilisateur";
}

function isActivePath(pathname: string | null, href?: string) {
  if (!pathname || !href) return false;
  if (href === "/user") return pathname === "/user";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      initial[group.title] = true;
    });
    return initial;
  });

  useEffect(() => {
    const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (savedCollapsed === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        setLoadingUser(true);
        const res = await fetch(`/api/users/profile?_ts=${Date.now()}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data?.user) {
          setCurrentUser(data.user);
          return;
        }

        setCurrentUser({
          name: "Utilisateur",
          email: "",
          role: "USER",
          roleLabel: "Utilisateur",
        });
      } catch {
        setCurrentUser({
          name: "Utilisateur",
          email: "",
          role: "USER",
          roleLabel: "Utilisateur",
        });
      } finally {
        setLoadingUser(false);
      }
    }

    loadUser();
  }, []);

  const filteredGroups = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return menuGroups;

    return menuGroups
      .map((group) => {
        const groupMatch = group.title.toLowerCase().includes(q);
        const items = groupMatch
          ? group.items
          : group.items.filter((item) => item.label.toLowerCase().includes(q));

        return { ...group, items };
      })
      .filter((group) => group.items.length > 0 || group.title.toLowerCase().includes(q));
  }, [menuSearch]);

  const currentProfilePhoto = String(currentUser?.profilePhoto || "").trim();
  const currentRoleLabel = getRoleLabel(currentUser);
  const userName = currentUser?.name || "Utilisateur";
  const userEmail = currentUser?.email || "";

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  function toggleGroup(title: string) {
    if (collapsed) return;
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  function openThemePanel() {
    window.dispatchEvent(new CustomEvent("strelitzia:open-theme-panel"));
  }

  function handleItemClick(item: MenuItem) {
    setMobileOpen(false);

    if (item.action === "logout") {
      logout();
      return;
    }

    if (item.action === "theme") {
      openThemePanel();
      return;
    }

    if (item.href) router.push(item.href);
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/55 lg:hidden"
        />
      )}

      <aside
        className={`sidebar-root fixed inset-y-0 left-0 z-50 flex h-dvh shrink-0 flex-col border-r border-slate-200/10 bg-slate-950 text-slate-100 shadow-2xl transition-[width,transform] duration-300 ease-out lg:sticky lg:top-0 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "w-[84px]" : "w-[276px]"}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,.96),rgba(2,6,23,.98))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,.16),transparent_45%)]" />

        <div className={`relative flex h-[68px] shrink-0 items-center border-b border-white/10 px-4 ${collapsed ? "justify-center" : "justify-between"}`}>
          <button
            type="button"
            onClick={() => router.push("/user")}
            className={`flex min-w-0 items-center rounded-2xl text-left transition hover:bg-white/[0.04] ${collapsed ? "justify-center" : "gap-3 pr-2"}`}
            title="Strelitzia School"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-[20px] text-cyan-100 shadow-sm">
              🎓
            </div>

            {!collapsed && (
              <div className="min-w-0 leading-none">
                <div className="truncate text-[14px] font-semibold tracking-[.08em] text-white">STRELITZIA</div>
                <div className="mt-1 text-[10px] font-medium tracking-[.18em] text-cyan-300/90">SCHOOL</div>
              </div>
            )}
          </button>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[15px] text-slate-200 transition hover:bg-white/10 lg:hidden"
              aria-label="Fermer le menu"
            >
              ✕
            </button>
          )}
        </div>

        <div className={`relative shrink-0 border-b border-white/10 px-4 py-3 ${collapsed ? "px-3" : ""}`}>
          <button
            type="button"
            onClick={() => router.push("/user/profile")}
            className={`flex w-full items-center rounded-2xl border border-white/10 bg-white/[0.055] text-left transition hover:border-cyan-300/25 hover:bg-white/[0.08] active:scale-[.99] ${
              collapsed ? "justify-center p-2" : "gap-3 p-3"
            }`}
            title="Ouvrir mon profil"
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 to-slate-800 text-sm shadow-sm ring-1 ring-white/10">
              {currentProfilePhoto ? (
                <img src={currentProfilePhoto} alt={userName} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center font-semibold text-white">
                  {loadingUser ? "…" : getUserInitials(userName, userEmail)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-white">{loadingUser ? "Chargement..." : userName}</p>
                <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[.12em] text-cyan-300/90">{currentRoleLabel}</p>
                <p className="mt-0.5 truncate text-[11px] font-normal text-slate-400">{userEmail || "Compte utilisateur"}</p>
              </div>
            )}
          </button>
        </div>

        {!collapsed && (
          <div className="relative shrink-0 border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/75 px-3 py-2.5 shadow-inner">
              <span className="text-[13px] text-slate-400">🔎</span>
              <input
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="w-full bg-transparent text-[12px] font-normal text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="Rechercher un menu..."
              />
              {menuSearch && (
                <button
                  type="button"
                  onClick={() => setMenuSearch("")}
                  className="grid h-6 w-6 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Effacer la recherche"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        <nav className={`sidebar-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3 ${collapsed ? "px-2" : "px-3"}`}>
          {filteredGroups.map((group) => {
            const isOpen = collapsed || openGroups[group.title] !== false;
            const groupHasActive = group.items.some((item) => isActivePath(pathname, item.href));

            return (
              <div key={group.title} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className={`group mb-1 flex w-full items-center rounded-2xl text-left text-[10px] font-medium uppercase tracking-[.11em] transition ${
                    collapsed ? "justify-center px-2 py-2" : "justify-between px-3 py-2"
                  } ${groupHasActive ? "bg-cyan-400/10 text-cyan-100" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-200"}`}
                  title={collapsed ? group.title : undefined}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[12px] ${groupHasActive ? "bg-cyan-400/15 text-cyan-200" : "bg-white/[0.045] text-slate-300"}`}>
                      {group.icon}
                    </span>
                    {!collapsed && <span className="truncate">{group.title}</span>}
                  </span>

                  {!collapsed && (
                    <span className={`text-[12px] text-slate-500 transition-transform ${isOpen ? "rotate-0" : "rotate-180"}`}>⌃</span>
                  )}
                </button>

                {isOpen && (
                  <div className={collapsed ? "space-y-1" : "space-y-1 pl-1"}>
                    {group.items.map((item) => {
                      const active = isActivePath(pathname, item.href);

                      return (
                        <button
                          key={`${group.title}-${item.label}`}
                          type="button"
                          onClick={() => handleItemClick(item)}
                          className={`group relative flex w-full items-center rounded-2xl border text-left text-[13px] transition-all duration-200 active:scale-[.985] ${
                            collapsed ? "justify-center px-2 py-2.5" : "gap-2 px-3 py-2.5"
                          } ${
                            active
                              ? "border-cyan-300/25 bg-white text-slate-950 shadow-sm"
                              : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.07] hover:text-white"
                          }`}
                          title={collapsed ? item.label : undefined}
                        >
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[12px] ${active ? "bg-slate-950 text-white" : "bg-white/[0.045] text-cyan-300/90 group-hover:bg-white/10 group-hover:text-white"}`}>
                            {item.icon || "›"}
                          </span>

                          {!collapsed && <span className={`truncate ${active ? "font-medium" : "font-normal"}`}>{item.label}</span>}

                          {active && !collapsed && <span className="ml-auto h-2 w-2 rounded-full bg-cyan-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredGroups.length === 0 && !collapsed && (
            <div className="mx-1 rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-center text-[12px] font-normal text-slate-300">
              Aucun menu trouvé
            </div>
          )}
        </nav>

        <div className={`relative shrink-0 border-t border-white/10 p-4 ${collapsed ? "px-3" : ""}`}>
          <button
            type="button"
            onClick={logout}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[13px] font-medium text-red-50 transition hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-950/25 ${collapsed ? "px-2" : ""}`}
            title="Déconnexion"
          >
            <span>⎋</span>
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined" && window.innerWidth >= 1024) toggleCollapsed();
          else setMobileOpen(true);
        }}
        className={`fixed top-3 z-[60] hidden h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-[18px] font-medium text-slate-800 shadow-lg shadow-slate-900/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 active:scale-95 lg:grid ${collapsed ? "left-[98px]" : "left-[290px]"}`}
        aria-label="Réduire ou ouvrir le menu"
        title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
      >
        {collapsed ? "☰" : "‹"}
      </button>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-[60] grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-[18px] font-medium text-slate-800 shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-50 active:scale-95 lg:hidden"
        aria-label="Ouvrir le menu"
        title="Ouvrir le menu"
      >
        ☰
      </button>

      <style jsx>{`
        .sidebar-root {
          font-family: Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .sidebar-scroll {
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.72) rgba(15, 23, 42, 0.85);
        }

        .sidebar-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .sidebar-scroll::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.82);
          border-left: 1px solid rgba(255, 255, 255, 0.05);
        }

        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.75);
          border: 2px solid rgba(15, 23, 42, 0.88);
          border-radius: 999px;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(203, 213, 225, 0.95);
        }
      `}</style>
    </>
  );
}
