"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  roleLabel?: string | null;
  profilePhoto?: string | null;
  active?: boolean;
};

type SchoolYear = {
  id: number;
  name: string;
  active: boolean;
};

type Student = {
  id: number;
  matricule: string;
  site: string;
  anneeScolaire: string;
  dateInscription: string;
  nom: string;
  prenoms: string;
  sexe: string;
  classe: string;
  section: string;
  contact?: string | null;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  pereNom?: string | null;
  mereNom?: string | null;
};

type StudentFeeRecap = {
  id?: number | string;
  code?: string | null;
  label?: string | null;
  libelle?: string | null;
  name?: string | null;
  amount?: number | string | null;
  montant?: number | string | null;
  montantTotal?: number | string | null;
  total?: number | string | null;
  amountPaid?: number | string | null;
  paid?: number | string | null;
  montantPaye?: number | string | null;
  reste?: number | string | null;
  remaining?: number | string | null;
  status?: string | null;
  paidAt?: string | null;
};

type AcademicLevel = {
  id: number;
  name: string;
  classes: {
    id: number;
    name: string;
    series: {
      id: number;
      name: string;
    }[];
  }[];
};

const menus = [
  {
    title: "Tableau de bord",
    items: [
      "Recette prévisionnel",
      "Matériel",
      "Dépenses prévisionnel",
      "CA prévisionnel",
    ],
  },
  {
    title: "Étudiants",
    items: [
      "Liste des inscrits",
      "Inscrire un étudiant",
      "Réinscription",
      "Modèles de frais",
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
    items: [
      "Trésorerie",
      "Mouvements de Trésorerie",
            
    ],
  },

  {
    title: "Activité extras",
    items: ["Favoris", "Forfait activité extras", "Inscription activité extras"],
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
    items: ["Thème"],
  },
];


type AppThemeKey =
  | "navy"
  | "black"
  | "midnight"
  | "obsidian"
  | "platinum"
  | "emerald"
  | "violet"
  | "royal"
  | "graphite"
  | "sky"
  | "ruby"
  | "teal";

type AppTheme = {
  key: AppThemeKey;
  name: string;
  label: string;
  icon: string;
  primary: string;
  primary2: string;
  dark: string;
  dark2: string;
  page: string;
  card: string;
  soft: string;
  text: string;
};

const appThemes: AppTheme[] = [
  { key: "navy", name: "Bleu Premium", label: "Professionnel scolaire", icon: "🔵", primary: "#2563eb", primary2: "#06b6d4", dark: "#071427", dark2: "#020817", page: "#eef3f9", card: "#ffffff", soft: "#eff6ff", text: "#0f172a" },
  { key: "black", name: "Noir Élégant", label: "Sidebar noir luxe + vue étudiants lisible", icon: "⚫", primary: "#f59e0b", primary2: "#facc15", dark: "#030712", dark2: "#000000", page: "#f4f6fb", card: "#ffffff", soft: "#f8fafc", text: "#0f172a" },
  { key: "midnight", name: "Midnight Business", label: "Bleu nuit ultra net, style ERP haut de gamme", icon: "🌑", primary: "#3b82f6", primary2: "#06b6d4", dark: "#020617", dark2: "#000000", page: "#f8fafc", card: "#ffffff", soft: "#e2e8f0", text: "#0f172a" },
  { key: "obsidian", name: "Obsidian Black", label: "Noir profond + or premium, texte étudiant très lisible", icon: "🖤", primary: "#f59e0b", primary2: "#fde047", dark: "#000000", dark2: "#020617", page: "#ffffff", card: "#ffffff", soft: "#f1f5f9", text: "#0f172a" },
  { key: "platinum", name: "Platinum 8K", label: "Clair, net, contrasté, sans effet flou", icon: "💎", primary: "#1d4ed8", primary2: "#0f172a", dark: "#0f172a", dark2: "#020617", page: "#f8fafc", card: "#ffffff", soft: "#eef2ff", text: "#0f172a" },
  { key: "emerald", name: "Vert Institution", label: "École moderne et stable", icon: "🟢", primary: "#059669", primary2: "#22c55e", dark: "#052e2b", dark2: "#021b18", page: "#ecfdf5", card: "#ffffff", soft: "#d1fae5", text: "#064e3b" },
  { key: "violet", name: "Violet Executive", label: "Créatif et haut de gamme", icon: "🟣", primary: "#7c3aed", primary2: "#ec4899", dark: "#1e103d", dark2: "#0f0826", page: "#f5f3ff", card: "#ffffff", soft: "#ede9fe", text: "#1e1b4b" },
  { key: "royal", name: "Royal Gold", label: "Style école privée premium", icon: "🟡", primary: "#b45309", primary2: "#f59e0b", dark: "#111827", dark2: "#020617", page: "#fffbeb", card: "#ffffff", soft: "#fef3c7", text: "#1f2937" },
  { key: "graphite", name: "Graphite Pro", label: "Sombre sobre, très logiciel pro", icon: "⬛", primary: "#475569", primary2: "#94a3b8", dark: "#0f172a", dark2: "#020617", page: "#f1f5f9", card: "#ffffff", soft: "#e2e8f0", text: "#0f172a" },
  { key: "sky", name: "Sky Campus", label: "Clair, moderne et agréable", icon: "🔷", primary: "#0284c7", primary2: "#38bdf8", dark: "#082f49", dark2: "#031a2d", page: "#f0f9ff", card: "#ffffff", soft: "#e0f2fe", text: "#0c4a6e" },
  { key: "ruby", name: "Ruby Prestige", label: "Premium rouge sombre", icon: "🔴", primary: "#be123c", primary2: "#fb7185", dark: "#3f0d18", dark2: "#1f0710", page: "#fff1f2", card: "#ffffff", soft: "#ffe4e6", text: "#3f0d18" },
  { key: "teal", name: "Teal Modern", label: "Élégant, doux et très lisible", icon: "🟦", primary: "#0f766e", primary2: "#2dd4bf", dark: "#042f2e", dark2: "#021817", page: "#f0fdfa", card: "#ffffff", soft: "#ccfbf1", text: "#134e4a" },
];

const STUDENT_PAGE_COLOR_STORAGE_KEY = "strelitzia-student-page-color";
const DEFAULT_STUDENT_PAGE_COLOR = "#eef3f9";

const studentPageColorPresets = [
  { name: "Bleu administratif", value: "#eef3f9", description: "clair, scolaire et professionnel" },
  { name: "Blanc premium", value: "#ffffff", description: "très net, style logiciel de gestion" },
  { name: "Gris ERP", value: "#f8fafc", description: "sobre, moderne et très lisible" },
  { name: "Vert institution", value: "#ecfdf5", description: "doux, stable et scolaire" },
  { name: "Ciel campus", value: "#f0f9ff", description: "clair, frais et accueillant" },
  { name: "Royal Gold", value: "#fffbeb", description: "premium, chaleureux et élégant" },
  { name: "Violet exécutif", value: "#f5f3ff", description: "créatif et haut de gamme" },
  { name: "Ruby discret", value: "#fff1f2", description: "prestige doux et professionnel" },
];

function isValidHexColor(value: string | null | undefined) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

const STUDENT_CACHE_PREFIX = "strelitzia-students-cache-";
const STUDENT_CACHE_VERSION = "v1";

function getStudentsCacheKey(year: string) {
  return `${STUDENT_CACHE_PREFIX}${STUDENT_CACHE_VERSION}-${year}`;
}

function clearAllStudentsCache() {
  if (typeof window === "undefined") return;

  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith(STUDENT_CACHE_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  });
}


function getUserInitials(name?: string | null, email?: string | null) {
  const raw = String(name || email || "U").trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts.length > 1 ? parts[1]?.[0] || "" : "";
  return `${first}${second}`.toUpperCase();
}

export default function UserDashboard({ user }: { user: AuthUser }) {
const [currentUser, setCurrentUser] = useState<AuthUser>(user);
const [profilePanelOpen, setProfilePanelOpen] = useState(false);
const [profileName, setProfileName] = useState(user.name || "");
const [profileMessage, setProfileMessage] = useState("");
const [savingProfileName, setSavingProfileName] = useState(false);
const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
const [currentPassword, setCurrentPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [showProfilePasswords, setShowProfilePasswords] = useState(false);
const [savingProfilePassword, setSavingProfilePassword] = useState(false);
const [sidebarOpen, setSidebarOpen] = useState(false);
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const [openActionId, setOpenActionId] = useState<string | number | null>(null);
const [menuSearch, setMenuSearch] = useState("");
const [themeKey, setThemeKey] = useState<AppThemeKey>("navy");
const [themePanelOpen, setThemePanelOpen] = useState(false);
const [themeSettingsTab, setThemeSettingsTab] = useState<"themes" | "preview" | "studentView" | "font">("themes");
const [fontScale, setFontScale] = useState<number>(1);
const [studentPageColor, setStudentPageColor] = useState(DEFAULT_STUDENT_PAGE_COLOR);

const [students, setStudents] = useState<Student[]>([]);
const [loadingStudents, setLoadingStudents] = useState(false);
const [studentRecapOpen, setStudentRecapOpen] = useState(false);
const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
const [studentFees, setStudentFees] = useState<StudentFeeRecap[]>([]);
const [loadingRecap, setLoadingRecap] = useState(false);

const [successMessage, setSuccessMessage] = useState("");
const [highlightId, setHighlightId] = useState<string | null>(null);

const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
const [selectedYear, setSelectedYear] = useState("2025-2026");

const [academics, setAcademics] = useState<{ levels: AcademicLevel[] }>({
  levels: [],
});

const [search, setSearch] = useState("");
const [classe, setClasse] = useState("TOUT");
const [serie, setSerie] = useState("TOUT");

const loadingStudentsRef = useRef(false);
const loadingAcademicsRef = useRef(false);
const initializedRef = useRef(false);

const currentTheme = appThemes.find((theme) => theme.key === themeKey) || appThemes[0];

const MIN_FONT_SCALE = 0.85;
const MAX_FONT_SCALE = 1.45;
const FONT_SCALE_STEP = 0.05;
const fontPercent = Math.round(fontScale * 100);

function clampFontScale(value: number) {
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round(value * 100) / 100));
}

function getFontScaleName(value: number) {
  if (value <= 0.9) return "Compact";
  if (value < 1.08) return "Standard";
  if (value < 1.25) return "Grand";
  return "Très grand";
}

const activeFontScaleName = getFontScaleName(fontScale);

const filteredMenus = useMemo(() => {
  const q = menuSearch.trim().toLowerCase();
  if (!q) return menus;

  return menus
    .map((menu) => {
      const titleMatch = menu.title.toLowerCase().includes(q);
      const items = titleMatch
        ? menu.items
        : menu.items.filter((item) => item.toLowerCase().includes(q));
      return { ...menu, items };
    })
    .filter((menu) => menu.items.length > 0 || menu.title.toLowerCase().includes(q));
}, [menuSearch]);

useEffect(() => {
  const savedTheme = localStorage.getItem("strelitzia-theme") as AppThemeKey | null;
  const savedFontScale = localStorage.getItem("strelitzia-font-scale");
  const savedStudentPageColor = localStorage.getItem(STUDENT_PAGE_COLOR_STORAGE_KEY);
  const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

  if (navigationEntry?.type === "reload") {
    clearAllStudentsCache();
  }

  if (savedTheme && appThemes.some((theme) => theme.key === savedTheme)) {
    setThemeKey(savedTheme);
  }

  if (savedFontScale) {
    const parsedFontScale = Number(savedFontScale);
    if (!Number.isNaN(parsedFontScale)) {
      setFontScale(clampFontScale(parsedFontScale));
    }
  }

 if (
  typeof savedStudentPageColor === "string" &&
  isValidHexColor(savedStudentPageColor)
) {
  setStudentPageColor(savedStudentPageColor);
}
}, []);

useEffect(() => {
  loadConnectedUserProfile();
}, []);

function applyTheme(nextTheme: AppThemeKey) {
  setThemeKey(nextTheme);
  localStorage.setItem("strelitzia-theme", nextTheme);
}

function applyFontScale(nextScale: number) {
  const safeScale = clampFontScale(nextScale);
  setFontScale(safeScale);
  localStorage.setItem("strelitzia-font-scale", String(safeScale));
}

function applyStudentPageColor(nextColor: string) {
  if (!isValidHexColor(nextColor)) return;
  setStudentPageColor(nextColor);
  localStorage.setItem(STUDENT_PAGE_COLOR_STORAGE_KEY, nextColor);
}

function resetStudentPageColor() {
  applyStudentPageColor(currentTheme.page || DEFAULT_STUDENT_PAGE_COLOR);
}

function increaseFontScale() {
  applyFontScale(fontScale + FONT_SCALE_STEP);
}

function decreaseFontScale() {
  applyFontScale(fontScale - FONT_SCALE_STEP);
}

const currentProfilePhoto = String(currentUser.profilePhoto || "").trim();
const currentRoleLabel = currentUser.roleLabel || currentUser.role || "Utilisateur";

const profilePasswordScore = useMemo(() => {
  let score = 0;
  if (newPassword.length >= 6) score += 1;
  if (newPassword.length >= 8) score += 1;
  if (/[A-Z]/.test(newPassword)) score += 1;
  if (/[0-9]/.test(newPassword)) score += 1;
  if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

  if (!newPassword) return { label: "Vide", width: "0%", color: "bg-slate-200" };
  if (score <= 2) return { label: "Faible", width: "35%", color: "bg-red-500" };
  if (score <= 4) return { label: "Moyen", width: "70%", color: "bg-amber-500" };
  return { label: "Fort", width: "100%", color: "bg-emerald-500" };
}, [newPassword]);

function showProfileMessage(text: string) {
  setProfileMessage(text);
  window.setTimeout(() => setProfileMessage(""), 4500);
}

async function loadConnectedUserProfile() {
  try {
    const res = await fetch(`/api/users/profile?_ts=${Date.now()}`, {
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.user) return;

    setCurrentUser((prev) => ({ ...prev, ...data.user }));
    setProfileName(data.user.name || user.name || "");
  } catch {
    // Tsy sakanana ny dashboard raha tsy afaka maka profil.
  }
}

async function saveConnectedUserName(e: FormEvent) {
  e.preventDefault();

  const nextName = profileName.trim();

  if (!nextName) {
    alert("Le nom est obligatoire");
    return;
  }

  try {
    setSavingProfileName(true);

    const res = await fetch("/api/users/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur modification profil");
      return;
    }

    setCurrentUser((prev) => ({ ...prev, ...(data.user || {}), name: data.user?.name || nextName }));
    setProfileName(data.user?.name || nextName);
    showProfileMessage("Informations du profil enregistrées avec succès");
  } catch {
    alert("Erreur réseau pendant la modification du profil");
  } finally {
    setSavingProfileName(false);
  }
}

async function uploadConnectedUserPhoto(file?: File | null) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Veuillez choisir une image valide");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    alert("Photo trop lourde. Maximum 2 Mo.");
    return;
  }

  try {
    setUploadingProfilePhoto(true);

    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch("/api/users/profile-photo", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur upload photo profil");
      return;
    }

    setCurrentUser((prev) => ({ ...prev, ...(data.user || {}), profilePhoto: data.profilePhoto || data.user?.profilePhoto || prev.profilePhoto }));
    showProfileMessage("Photo de profil mise à jour avec succès");
  } catch {
    alert("Erreur réseau pendant l’upload photo profil");
  } finally {
    setUploadingProfilePhoto(false);
  }
}

async function removeConnectedUserPhoto() {
  if (!currentProfilePhoto) return;
  if (!confirm("Supprimer votre photo de profil ?")) return;

  try {
    setUploadingProfilePhoto(true);

    const formData = new FormData();
    formData.append("action", "delete");

    const res = await fetch("/api/users/profile-photo", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur suppression photo profil");
      return;
    }

    setCurrentUser((prev) => ({ ...prev, ...(data.user || {}), profilePhoto: null }));
    showProfileMessage("Photo de profil supprimée");
  } catch {
    alert("Erreur réseau pendant la suppression photo profil");
  } finally {
    setUploadingProfilePhoto(false);
  }
}

async function changeConnectedUserPassword(e: FormEvent) {
  e.preventDefault();

  if (!currentPassword || !newPassword || !confirmPassword) {
    alert("Veuillez remplir tous les champs mot de passe");
    return;
  }

  if (newPassword.length < 6) {
    alert("Le nouveau mot de passe doit contenir au moins 6 caractères");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("La confirmation ne correspond pas au nouveau mot de passe");
    return;
  }

  try {
    setSavingProfilePassword(true);

    const res = await fetch("/api/users/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur changement mot de passe");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    showProfileMessage(data.message || "Mot de passe modifié avec succès");
  } catch {
    alert("Erreur réseau pendant le changement de mot de passe");
  } finally {
    setSavingProfilePassword(false);
  }
}

async function loadSchoolYears() {
  try {
    const res = await fetch(`/api/school-years?_ts=${Date.now()}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (Array.isArray(data)) {
      setSchoolYears(data);

      const active = data.find((y: SchoolYear) => y.active);
      return active?.name || data[0]?.name || "2025-2026";
    }

    return "2025-2026";
  } catch {
    setSchoolYears([]);
    return "2025-2026";
  }
}

async function loadAcademics(yearParam?: string) {
  if (loadingAcademicsRef.current) return;

  try {
    loadingAcademicsRef.current = true;

    const yearToUse = yearParam || selectedYear;

    if (!yearToUse) return;

    const res = await fetch(
      `/api/academics?year=${encodeURIComponent(yearToUse)}&_ts=${Date.now()}`,
      {
        cache: "no-store",
      }
    );

    const data = await res.json();

    setAcademics({
      levels: Array.isArray(data?.levels)
        ? data.levels
        : [],
    });
  } catch {
    setAcademics({
      levels: [],
    });
  } finally {
    loadingAcademicsRef.current = false;
  }
}

async function loadStudents(yearParam?: string, forceRefresh = false) {
  const yearToUse = yearParam || selectedYear;

  if (!yearToUse) return;

  const cacheKey = getStudentsCacheKey(yearToUse);

  if (!forceRefresh && typeof window !== "undefined") {
    const cachedStudents = sessionStorage.getItem(cacheKey);

    if (cachedStudents) {
      try {
        const parsed = JSON.parse(cachedStudents);

        if (Array.isArray(parsed)) {
          setStudents(parsed);
          setLoadingStudents(false);
          return;
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }
  }

  if (loadingStudentsRef.current) return;

  try {
    loadingStudentsRef.current = true;
    setLoadingStudents(true);

    const res = await fetch(
      `/api/students?year=${encodeURIComponent(yearToUse)}&_ts=${Date.now()}`,
      {
        cache: "no-store",
      }
    );

    const data = await res.json();

    const studentList = Array.isArray(data)
      ? data
      : data.students || [];

    setStudents(studentList);

    if (typeof window !== "undefined") {
      sessionStorage.setItem(cacheKey, JSON.stringify(studentList));
    }

  } catch (error) {
    console.error(error);
  } finally {
    loadingStudentsRef.current = false;
    setLoadingStudents(false);
  }
}  
 useEffect(() => {
  async function initDashboard() {
    const params = new URLSearchParams(window.location.search);

    const urlYear = params.get("year");
    const urlHighlight = params.get("highlight");

    const yearToUse =
      urlYear || (await loadSchoolYears());

    const message =
      localStorage.getItem("studentSuccessMessage");

    if (message) {
      setSuccessMessage(message);

      setTimeout(() => {
        setSuccessMessage("");
      }, 6000);

      localStorage.removeItem(
        "studentSuccessMessage"
      );
    }

    if (urlHighlight) {
      setHighlightId(urlHighlight);
    }

    setSelectedYear(yearToUse);

    setClasse("TOUT");
    setSerie("TOUT");

    await Promise.all([
      loadStudents(yearToUse),
      loadAcademics(yearToUse),
    ]);

    initializedRef.current = true;
  }

  initDashboard();
}, []);

useEffect(() => {
  if (!initializedRef.current) return;
  if (!selectedYear) return;

  setClasse("TOUT");
  setSerie("TOUT");

  Promise.all([
    loadStudents(selectedYear),
    loadAcademics(selectedYear),
  ]);
}, [selectedYear]);




 

  const allClasses = useMemo(() => {
    return academics.levels.flatMap((level) => level.classes);
  }, [academics]);

  const selectedClassObj = allClasses.find((c) => c.name === classe);

  const availableSeries =
    classe === "TOUT"
      ? allClasses.flatMap((c) => c.series)
      : selectedClassObj?.series || [];

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const text = `
        ${s.matricule}
        ${s.site}
        ${s.anneeScolaire}
        ${s.nom}
        ${s.prenoms}
        ${s.sexe}
        ${s.classe}
        ${s.section}
        ${s.contact || ""}
        ${s.lieuNaissance || ""}
      `.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (classe === "TOUT" || s.classe === classe) &&
        (serie === "TOUT" || s.section === serie)
      );
    });
  }, [students, search, classe, serie]);

  function resetFilters() {
    setSearch("");
    setClasse("TOUT");
    setSerie("TOUT");
  }

  function formatDate(date?: string | null) {
    if (!date) return "-";
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("fr-FR");
  }

  function toNumber(value: unknown) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      const cleaned = value.replace(/\s/g, "").replace(/,/g, ".");
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }


  function feeLabel(fee: StudentFeeRecap) {
    return fee.label || fee.libelle || fee.name || "Frais";
  }

  function feeAmount(fee: StudentFeeRecap) {
    return fee.amount ?? fee.montantTotal ?? fee.montant ?? fee.total ?? 0;
  }

  function feePaid(fee: StudentFeeRecap) {
    return fee.amountPaid ?? fee.montantPaye ?? fee.paid ?? 0;
  }

  function feeRemaining(fee: StudentFeeRecap) {
    if (fee.remaining !== undefined && fee.remaining !== null) return fee.remaining;
    if (fee.reste !== undefined && fee.reste !== null) return fee.reste;
    return Math.max(0, toNumber(feeAmount(fee)) - toNumber(feePaid(fee)));
  }

  function normalizeFeeStatus(fee: StudentFeeRecap) {
    const raw = String(fee.status || "").toUpperCase();

    if (raw.includes("PAYE") || raw.includes("PAID")) return "PAYE";
    if (raw.includes("PARTIEL") || raw.includes("PARTIAL")) return "PARTIEL";

    const remaining = toNumber(feeRemaining(fee));
    const paid = toNumber(feePaid(fee));
    const amount = toNumber(feeAmount(fee));

    if (amount > 0 && remaining <= 0) return "PAYE";
    if (paid > 0 && remaining > 0) return "PARTIEL";
    return "NON_PAYE";
  }


  function openStudentRecap(student: Student) {
    setSelectedStudent(student);
    setStudentRecapOpen(true);
  }

  function printStudentInfo(student: Student) {
    const rows = [
      ["Matricule", student.matricule],
      ["Site", student.site],
      ["Année scolaire", student.anneeScolaire],
      ["Date inscription", formatDate(student.dateInscription)],
      ["Nom", student.nom],
      ["Prénom(s)", student.prenoms],
      ["Sexe", student.sexe],
      ["Classe", student.classe],
      ["Série / Section", student.section],
      ["Contact", student.contact || "-"],
      ["Date de naissance", formatDate(student.dateNaissance)],
      ["Lieu de naissance", student.lieuNaissance || "-"],
      ["Père", student.pereNom || "-"],
      ["Mère", student.mereNom || "-"],
    ];

    const html = `
      <html>
        <head>
          <title>Information étudiant - ${student.matricule}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
            .header { border-bottom: 3px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; }
            .school { font-size: 24px; font-weight: 900; letter-spacing: .04em; }
            .title { margin-top: 6px; font-size: 15px; font-weight: 800; color: #2563eb; }
            .student { margin-top: 12px; padding: 12px; border: 1px solid #cbd5e1; border-radius: 14px; background: #f8fafc; }
            .name { font-size: 20px; font-weight: 900; }
            .meta { margin-top: 4px; font-size: 12px; color: #475569; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
            td { border: 1px solid #cbd5e1; padding: 9px 10px; }
            td:first-child { width: 34%; background: #f1f5f9; font-weight: 900; color: #334155; }
            td:last-child { font-weight: 700; color: #0f172a; }
            .footer { margin-top: 18px; text-align: right; color: #64748b; font-size: 11px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school">STRELITZIA SCHOOL</div>
            <div class="title">Fiche information étudiant</div>
          </div>
          <div class="student">
            <div class="name">${student.nom || ""} ${student.prenoms || ""}</div>
            <div class="meta">M° ${student.matricule || "-"} • ${student.classe || "Classe -"} • ${student.section || "Série -"}</div>
          </div>
          <table>
            <tbody>
              ${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value || "-"}</td></tr>`).join("")}
            </tbody>
          </table>
          <div class="footer">Imprimé le ${new Date().toLocaleDateString("fr-FR")}</div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return alert("Popup bloqué");

    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
    }, 400);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function deleteStudent(id: number) {
    if (!confirm("Supprimer cet étudiant ?")) return;

    const res = await fetch(`/api/students/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Erreur suppression étudiant");
      return;
    }

    if (selectedYear) {
      sessionStorage.removeItem(getStudentsCacheKey(selectedYear));
    }

    loadStudents(selectedYear, true);
  }

  function handleMenuClick(item: string) {
    if (item === "Thème") {
      setThemePanelOpen(true);
      return;
    }

    if (item === "Liste des inscrits") {
      window.location.href = `/user?_ts=${Date.now()}`;
      return;
    }

    if (item === "Inscrire un étudiant") {
      window.location.href = "/user/inscription";
      return;
    }
        if (item === "Réinscription") {
      window.location.href = "/user/reinscription";
      return;
    }
        if (item === "Modèles de frais") {
      window.location.href = "/user/fee-models";
      return;
    }
     
      if (item === "Trésorerie") {
  window.location.href = "/user/treasuries";
  return;
}

if (item === "Mouvements de Trésorerie") {
  window.location.href = "/user/treasury-movements";
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
    if (item === "État paiement des frais") {
  window.location.href = "/user/fee-payment-status";
  return;
}

    alert(item);
  }

  return (
    <main
      className="crisp-ui fixed inset-0 flex overflow-hidden text-base text-slate-900"
      style={{
        background: currentTheme.dark2,
        ["--theme-primary" as any]: currentTheme.primary,
        ["--theme-primary-2" as any]: currentTheme.primary2,
        ["--theme-dark" as any]: currentTheme.dark,
        ["--theme-dark-2" as any]: currentTheme.dark2,
        ["--theme-page" as any]: currentTheme.page,
        ["--theme-card" as any]: currentTheme.card,
        ["--theme-soft" as any]: currentTheme.soft,
        ["--theme-text" as any]: currentTheme.text,
        ["--student-page-color" as any]: studentPageColor,
        ["--font-scale" as any]: fontScale,
      }}
    >
      <style>{`

        .crisp-ui, .crisp-ui * {
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-synthesis-weight: none;
          letter-spacing: -0.005em;
        }
        .crisp-ui input, .crisp-ui select, .crisp-ui button, .crisp-ui table {
          text-rendering: optimizeLegibility;
        }
        .crisp-ui {
          font-size: calc(15px * var(--font-scale));
          font-family: Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-weight: 500;
        }
        .crisp-ui h1 { font-size: calc(23px * var(--font-scale)) !important; font-weight: 750 !important; }
        .crisp-ui h2 { font-size: calc(26px * var(--font-scale)) !important; font-weight: 750 !important; }
        .crisp-ui h3 { font-size: calc(18px * var(--font-scale)) !important; font-weight: 700 !important; }
        .crisp-ui p,
        .crisp-ui span,
        .crisp-ui button,
        .crisp-ui input,
        .crisp-ui select,
        .crisp-ui label,
        .crisp-ui footer {
          font-size: calc(14px * var(--font-scale)) !important;
          line-height: 1.38;
        }
        .crisp-ui td,
        .crisp-ui th {
          font-size: calc(13px * var(--font-scale)) !important;
          line-height: 1.32;
        }
        .student-table { font-size: calc(13px * var(--font-scale)) !important; }
        .student-table th { font-size: calc(12px * var(--font-scale)) !important; font-weight: 700 !important; }
        .student-table td { font-size: calc(13px * var(--font-scale)) !important; font-weight: 500 !important; }
        .font-scaled-input { font-size: calc(14px * var(--font-scale)) !important; }
        .student-loading-spinner {
          width: 18px;
          height: 18px;
          border: 3px solid #e2e8f0;
          border-top-color: var(--theme-primary);
          border-radius: 999px;
          animation: studentSpin .75s linear infinite;
        }
        .student-loading-mini {
          position: sticky;
          top: 8px;
          left: 8px;
          z-index: 60;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          max-width: max-content;
          border: 1px solid #e2e8f0;
          background: rgba(255,255,255,.96);
          color: #0f172a;
          border-radius: 999px;
          padding: 7px 12px;
          font-size: calc(14px * var(--font-scale));
          font-weight: 900;
          box-shadow: 0 8px 22px rgba(15, 23, 42, .10);
        }
        @keyframes studentSpin { to { transform: rotate(360deg); } }
        .no-blur-shadow { box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10); }
        .erp-toolbar { position: sticky; top: 0; z-index: 20; background: #fff; }
        .theme-gradient { background: linear-gradient(135deg, var(--theme-primary), var(--theme-primary-2)); }
        .theme-sidebar { background: linear-gradient(180deg, var(--theme-dark), color-mix(in srgb, var(--theme-dark) 82%, var(--theme-primary) 18%) 52%, var(--theme-dark-2)); }

        /* Sidebar stylé: texte premium, léger, hiérarchie claire, tsy bold be */
        .theme-sidebar {
          font-size: calc(12.5px * var(--font-scale));
          line-height: 1.34;
          font-weight: 500;
        }
        .theme-sidebar button,
        .theme-sidebar input,
        .theme-sidebar p,
        .theme-sidebar span,
        .theme-sidebar div {
          line-height: 1.34;
          letter-spacing: .005em;
        }
        .theme-sidebar .sidebar-brand-name {
          font-size: calc(15px * var(--font-scale)) !important;
          font-weight: 720 !important;
          letter-spacing: .055em;
          line-height: 1;
        }
        .theme-sidebar .sidebar-brand-subtitle {
          font-size: calc(10px * var(--font-scale)) !important;
          font-weight: 650 !important;
          letter-spacing: .13em;
          line-height: 1;
        }
        .theme-sidebar .sidebar-profile-name {
          font-size: calc(12px * var(--font-scale)) !important;
          font-weight: 650 !important;
        }
        .theme-sidebar .sidebar-profile-role {
          font-size: calc(9.8px * var(--font-scale)) !important;
          font-weight: 650 !important;
          letter-spacing: .08em;
        }
        .theme-sidebar .sidebar-profile-email {
          font-size: calc(10px * var(--font-scale)) !important;
          font-weight: 450 !important;
        }
        .theme-sidebar .sidebar-search-input {
          font-size: calc(11.5px * var(--font-scale)) !important;
          font-weight: 450 !important;
        }
        .theme-sidebar .sidebar-section-title {
          font-size: calc(10px * var(--font-scale)) !important;
          font-weight: 650 !important;
          letter-spacing: .11em;
          opacity: .92;
        }
        .theme-sidebar .sidebar-menu-item {
          font-size: calc(12px * var(--font-scale)) !important;
          font-weight: 480 !important;
          line-height: 1.34;
          letter-spacing: .01em;
        }
        .theme-sidebar .sidebar-menu-item:hover {
          font-weight: 580 !important;
        }
        .theme-sidebar .sidebar-logout-btn {
          font-size: calc(12px * var(--font-scale)) !important;
          font-weight: 650 !important;
        }
        .theme-page { background: var(--theme-page); color: var(--theme-text); }
        .student-shell { background: var(--student-page-color); transition: background-color .2s ease; }
        .theme-button { background: linear-gradient(135deg, var(--theme-primary), var(--theme-primary-2)); }
        .theme-dark-btn { background: var(--theme-dark); }



        /* Typographie premium globale: moins de gras, rendu plus élégant */
        .crisp-ui .font-black { font-weight: 650 !important; }
        .crisp-ui .font-bold { font-weight: 560 !important; }
        .top-actions button,
        .student-toolbar-inner select,
        .student-toolbar-inner input,
        .student-toolbar-inner button,
        .search-card button,
        .controls-card select {
          font-weight: 600 !important;
          letter-spacing: .005em;
        }
        .student-table .font-black,
        .student-table .font-bold {
          font-weight: 600 !important;
        }

        .school-scroll::-webkit-scrollbar { width: 7px; }
        .school-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,.45); border-radius: 999px; }
        .school-scroll::-webkit-scrollbar-track { background: transparent; }

        .table-scroll::-webkit-scrollbar { width: 9px; height: 9px; }
        .table-scroll::-webkit-scrollbar-thumb { background: #64748b; border-radius: 999px; border: 2px solid #e2e8f0; }
        .table-scroll::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 999px; }



        .student-card, .controls-card, .search-card, .topbar { color: #0f172a; }
        .top-actions { flex-wrap: nowrap !important; overflow-x: auto; overflow-y: hidden; max-width: 100%; padding-bottom: 2px; scrollbar-width: thin; }
        .top-actions::-webkit-scrollbar { height: 5px; }
        .top-actions::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 999px; }
        .student-list-heading { font-size: calc(17px * var(--font-scale)) !important; font-weight: 560 !important; letter-spacing: -0.015em; }
        .student-list-subtitle { font-size: calc(11.5px * var(--font-scale)) !important; font-weight: 450 !important; letter-spacing: .01em; }
        .top-actions { gap: 6px !important; }
        .top-actions button { height: 34px; min-width: max-content; border-radius: 10px; padding-left: 12px; padding-right: 12px; font-size: calc(11.5px * var(--font-scale)) !important; font-weight: 500 !important; box-shadow: 0 5px 12px rgba(15,23,42,.08); white-space: nowrap; line-height: 1; }
        .mobile-filter-grid select, .mobile-filter-grid div, .search-card input, .search-card button { height: 34px; border-radius: 10px; font-size: calc(11.5px * var(--font-scale)) !important; font-weight: 480 !important; line-height: 1.1; }
        .student-toolbar-scroll { overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
        .student-toolbar-scroll::-webkit-scrollbar { height: 5px; }
        .student-toolbar-scroll::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 999px; }
        .student-toolbar-inner { min-width: 620px; }
        .filter-toolbar-inner { min-width: 610px; }
        @media (max-width: 640px) {
          .student-shell { padding: 8px; }
          .student-card { border-radius: 18px; }
          .top-actions { display: flex; width: 100%; gap: 6px; }
          .top-actions button { height: 32px; padding-left: 10px; padding-right: 10px; font-size: calc(11px * var(--font-scale)) !important; white-space: nowrap; }
          .mobile-filter-grid { grid-template-columns: repeat(4, minmax(125px, 1fr)) !important; gap: 6px; }
          .controls-card, .search-card { padding: 6px; }
          .search-card .flex.flex-1 { display: flex; min-width: 560px; gap: 6px; }
          .search-card .relative { max-width: 260px; }
        }


        /* Police normale 100% — toolbar, filtres, recherche et boutons */
        .student-toolbar-inner,
        .filter-toolbar-inner,
        .top-actions,
        .search-card,
        .controls-card,
        .topbar {
          font-size: calc(12px * var(--font-scale)) !important;
        }

        .student-toolbar-inner select,
        .student-toolbar-inner input,
        .student-toolbar-inner button,
        .filter-toolbar-inner select,
        .filter-toolbar-inner div,
        .top-actions button,
        .search-card input,
        .search-card button {
          font-size: calc(11.5px * var(--font-scale)) !important;
          font-weight: 480 !important;
          min-height: 34px;
        }

        .search-card input::placeholder {
          font-size: calc(11.5px * var(--font-scale)) !important;
          font-weight: 450;
        }

        .student-table button,
        .student-table span {
          font-size: calc(13px * var(--font-scale)) !important;
        }

        .premium-select {
          background-image:
            linear-gradient(45deg, transparent 50%, #94a3b8 50%),
            linear-gradient(135deg, #94a3b8 50%, transparent 50%);
          background-position:
            calc(100% - 16px) 50%,
            calc(100% - 11px) 50%;
          background-size: 5px 5px, 5px 5px;
          background-repeat: no-repeat;
          appearance: none;
        }

        .sticky-action-col {
          position: sticky;
          right: 0;
          z-index: 25;
          box-shadow: -8px 0 18px rgba(15, 23, 42, 0.08);
        }
        thead .sticky-action-col { z-index: 45; }

        @media (max-width: 1024px) {
          .student-table { min-width: 1020px !important; }
        }

        @media (max-width: 768px) {
          .student-toolbar-inner { min-width: 600px; }
          .filter-toolbar-inner { min-width: 580px; }
          .student-shell { padding: 8px !important; }
          .student-card { border-radius: 16px !important; }
          .student-table { min-width: 1120px !important; font-size: calc(13px * var(--font-scale)) !important; }
          .student-table th,
          .student-table td { padding: 5px 6px !important; }
          .mobile-hide { display: table-cell !important; }
          .mobile-action-btn { min-width: 32px; height: 28px; }
          .mobile-filter-grid { grid-template-columns: repeat(4, minmax(125px, 1fr)) !important; }
        }

        @media print {
          aside, .topbar, .controls-card, .search-card, footer, .mobile-overlay { display: none !important; }
          main { position: static !important; display: block !important; background: white !important; }
          section { height: auto !important; overflow: visible !important; }
          .table-scroll { overflow: visible !important; }
          .student-table { min-width: 100% !important; font-size: 11px !important; }
        }
      `}</style>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-[255px] shrink-0 flex-col border-r border-white/10 theme-sidebar text-white shadow-2xl transition-all duration-300 lg:relative ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${sidebarCollapsed ? "lg:w-[84px]" : "lg:w-[255px]"}`}
      >
        <div className={`flex h-[68px] shrink-0 items-center justify-between border-b border-white/10 px-4 ${sidebarCollapsed ? "lg:justify-center lg:px-3" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-[23px] shadow-lg shadow-cyan-950/40">
              🎓
            </div>
            <div className={`leading-none ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              <div className="sidebar-brand-name font-semibold text-white">STRELITZIA</div>
              <div className="sidebar-brand-subtitle mt-1 font-semibold text-cyan-400">SCHOOL</div>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg hover:bg-white/10 lg:hidden"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          onClick={() => setProfilePanelOpen(true)}
          className={`mx-4 mt-4 shrink-0 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left shadow-inner transition hover:bg-white/[0.10] active:scale-[.99] ${sidebarCollapsed ? "lg:mx-3" : ""}`}
          title="Ouvrir mon profil"
        >
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-xl shadow-lg ring-2 ring-white/10">
              {currentProfilePhoto ? (
                <img src={currentProfilePhoto} alt={currentUser.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-sm font-semibold text-white">
                  {getUserInitials(currentUser.name, currentUser.email)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#071d35] bg-emerald-400" />
            </div>

            <div className={`min-w-0 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              <p className="sidebar-profile-name truncate">{currentUser.name}</p>
              <p className="sidebar-profile-role uppercase tracking-wide text-cyan-300">{currentRoleLabel}</p>
              <p className="sidebar-profile-email truncate text-slate-300">{currentUser.email}</p>
              
            </div>
          </div>
        </button>

        <div className={`mx-4 mt-4 shrink-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">🔎</span>
            <input
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              className="sidebar-search-input w-full bg-transparent text-white outline-none placeholder:text-slate-500"
              placeholder="Rechercher menu..."
            />
          </div>
        </div>

        <nav className={`school-scroll mt-4 flex-1 overflow-y-auto px-2 pb-3 ${sidebarCollapsed ? "lg:px-3" : ""}`}>
          {filteredMenus.map((menu) => (
            <div key={menu.title} className="mb-2">
              <div className={`mb-1 flex items-center justify-between rounded-xl px-3 py-2 sidebar-section-title uppercase text-slate-300 ${sidebarCollapsed ? "lg:justify-center lg:px-1" : ""}`}>
                <span className="flex items-center gap-2">
                  <span className="text-cyan-400">{menu.title === "Étudiants" ? "🎓" : menu.title === "Liste Trésorerie" ? "💳" : menu.title === "Paramètres" ? "⚙" : "▣"}</span>
                  <span className={`${sidebarCollapsed ? "lg:hidden" : ""}`}>{menu.title}</span>
                </span>
                <span className={`text-slate-500 ${sidebarCollapsed ? "lg:hidden" : ""}`}>⌃</span>
              </div>

              {menu.items.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    handleMenuClick(item);
                    setSidebarOpen(false);
                  }}
                  className={`group mb-1 flex w-full items-center gap-2 rounded-xl border-l-4 border-transparent px-3 py-2 sidebar-menu-item text-left text-slate-200 transition-all duration-200 hover:translate-x-1 hover:border-l-cyan-300 hover:bg-white/10 hover:text-white active:scale-[.98] ${sidebarCollapsed ? "lg:justify-center lg:px-2" : ""}`}
                >
                  <span className="text-cyan-400 transition group-hover:text-white">›</span>
                  <span className={`truncate ${sidebarCollapsed ? "lg:hidden" : ""}`}>{item}</span>
                </button>
              ))}
            </div>
          ))}

          {filteredMenus.length === 0 && (
            <div className="mx-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center text-[12px] font-medium text-slate-300">
              Aucun menu trouvé
            </div>
          )}
        </nav>

        <div className={`shrink-0 border-t border-white/10 p-4 ${sidebarCollapsed ? "lg:px-3" : ""}`}>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 sidebar-logout-btn text-white transition hover:bg-red-600 hover:shadow-lg hover:shadow-red-950/30"
          >
            <span>⎋</span><span className={`${sidebarCollapsed ? "lg:hidden" : ""}`}>Déconnexion</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="mobile-overlay fixed inset-0 z-40 bg-slate-950/70  lg:hidden"
        />
      )}

      <section className="theme-page flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="topbar flex h-[54px] shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-3 shadow-sm md:px-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth >= 1024) {
                  setSidebarCollapsed((v) => !v);
                } else {
                  setSidebarOpen(true);
                }
              }}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-[20px] font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
              aria-label="Ouvrir ou réduire le menu"
              title="Ouvrir / réduire le menu"
            >
              {sidebarCollapsed ? "☰" : "☰"}
            </button>
            <div className="hidden md:block">
              <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-slate-400">Administration</p>
              <p className="text-[13px] font-semibold text-slate-800">Gestion des étudiants</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setProfilePanelOpen(true)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:bg-slate-50 active:scale-[.99]"
            title="Ouvrir mon profil"
          >
            <div className="max-w-[155px] truncate text-[10px] font-medium text-slate-600 sm:max-w-none sm:px-1 sm:text-[11px]">
              Connecté : <b className="text-slate-900">{currentUser.name}</b>
            </div>
            <div className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-orange-400 text-sm shadow-sm ring-2 ring-slate-100">
              {currentProfilePhoto ? (
                <img src={currentProfilePhoto} alt={currentUser.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[11px] font-semibold text-white">
                  {getUserInitials(currentUser.name, currentUser.email)}
                </div>
              )}
            </div>
          </button>
        </header>

        <div className="student-shell flex-1 overflow-auto p-2 md:p-3" style={{ backgroundColor: studentPageColor }}>
          <div className="student-card overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
            <div className="border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-slate-100 p-2 md:p-2.5">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="mb-1.5 h-0.5 w-10 rounded-full theme-gradient" />
                  <h1 className="student-list-heading text-slate-950">
                    Liste des étudiants
                  </h1>
                  <p className="student-list-subtitle mt-0.5 text-blue-600">
                    {filtered.length} étudiant{filtered.length > 1 ? "s" : ""} inscrit{filtered.length > 1 ? "s" : ""}
                    {loadingStudents ? " • Chargement..." : ""}
                  </p>
                </div>

                <div className="top-actions flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (selectedYear) {
                        sessionStorage.removeItem(getStudentsCacheKey(selectedYear));
                      }

                      loadSchoolYears();
                      loadStudents(selectedYear, true);
                      loadAcademics(selectedYear);
                    }}
                    className="h-8 rounded-lg theme-dark-btn px-3 text-[11px] font-medium text-white shadow-sm shadow-slate-300 transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    ⟳ Actualiser
                  </button>

                  <button
                    onClick={() => {
                      const rows = filtered.map((s) => ({
                        Matricule: s.matricule || "",
                        Nom: s.nom || "",
                        Prenoms: s.prenoms || "",
                        Classe: s.classe || "",
                        Serie: s.section || "",
                        Telephone: s.contact || "",
                      }));

                      import("xlsx").then((XLSX) => {
                        const worksheet = XLSX.utils.json_to_sheet(rows);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, "Etudiants");
                        XLSX.writeFile(
                          workbook,
                          `etudiants_${selectedYear || "2025-2026"}.xlsx`
                        );
                      });
                    }}
                    className="h-8 rounded-lg bg-emerald-600 px-3 text-[11px] font-medium text-white shadow-sm shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700"
                  >
                    ▣ Export Excel
                  </button>

                  <button
                    onClick={() => {
                      const byClass = filtered.reduce((acc: any, s: any) => {
                        const key = s.classe || "Sans classe";
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(s);
                        return acc;
                      }, {});

                      const html = `
                        <html>
                          <head>
                            <title>Liste des étudiants</title>
                            <style>
                              @page { size: A4; margin: 12mm; }
                              body { font-family: Arial, sans-serif; color: #111827; }
                              .page { page-break-after: always; }
                              .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
                              .school { font-size: 22px; font-weight: 900; color: #dc2626; }
                              .sub { font-size: 13px; color: #16a34a; font-weight: 700; }
                              .meta { margin-top: 8px; font-size: 12px; color: #374151; }
                              table { width: 100%; border-collapse: collapse; font-size: 11px; }
                              th { background: #111827; color: white; padding: 7px; border: 1px solid #111827; text-align: left; }
                              td { padding: 6px; border: 1px solid #cbd5e1; }
                              tr:nth-child(even) { background: #f8fafc; }
                              .footer { margin-top: 12px; font-size: 11px; color: #64748b; text-align: right; }
                            </style>
                          </head>
                          <body>
                            ${Object.entries(byClass)
                              .map(([classeName, students]: any) => `
                                <div class="page">
                                  <div class="header">
                                    <div class="school">STRELITZIA SCHOOL</div>
                                    <div class="sub">Liste des étudiants par classe</div>
                                    <div class="meta">
                                      Année scolaire : ${selectedYear || "2025-2026"} |
                                      Classe : ${classeName} |
                                      Effectif : ${students.length}
                                    </div>
                                  </div>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>N°</th>
                                        <th>Matricule</th>
                                        <th>Nom</th>
                                        <th>Prénoms</th>
                                        <th>Date de naissance</th>
                                        <th>Sexe</th>
                                        <th>Série</th>
                                        <th>Téléphone</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${students.map((s: any, i: number) => `
                                        <tr>
                                          <td>${i + 1}</td>
                                          <td>${s.matricule || ""}</td>
                                          <td>${s.nom || ""}</td>
                                          <td>${s.prenoms || ""}</td>
                                          <td>${s.dateNaissance ? new Date(s.dateNaissance).toLocaleDateString("fr-FR") : ""}</td>
                                          <td>${s.sexe || ""}</td>
                                          <td>${s.section || ""}</td>
                                          <td>${s.contact || ""}</td>
                                        </tr>
                                      `).join("")}
                                    </tbody>
                                  </table>
                                  <div class="footer">Imprimé le ${new Date().toLocaleDateString("fr-FR")}</div>
                                </div>
                              `)
                              .join("")}
                          </body>
                        </html>
                      `;

                      const win = window.open("", "_blank", "width=900,height=700");
                      if (!win) return alert("Popup bloqué");

                      win.document.write(html);
                      win.document.close();
                      win.focus();

                      setTimeout(() => {
                        win.print();
                      }, 500);
                    }}
                    className="h-8 rounded-lg theme-button px-3 text-[11px] font-medium text-white shadow-sm shadow-blue-200 transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    ⎙ Imprimer PDF
                  </button>
                </div>
              </div>

              {successMessage && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-700">
                  {successMessage}
                </div>
              )}
            </div>

            <div className="controls-card erp-toolbar border-b border-slate-200 bg-white p-1.5 md:p-2">
              <div className="student-toolbar-scroll"><div className="student-toolbar-inner filter-toolbar-inner mobile-filter-grid grid grid-cols-4 gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setClasse("TOUT");
                    setSerie("TOUT");
                  }}
                  className="premium-select h-8 min-w-[150px] rounded-lg border border-slate-200 theme-dark-btn px-2.5 pr-7 text-[11px] font-medium text-white outline-none ring-blue-200 transition focus:ring-4"
                >
                  {schoolYears.length === 0 && <option value="">Année scolaire</option>}

                  {schoolYears.map((year) => (
                    <option key={year.id} value={year.name}>
                      Année scolaire : {year.name}
                      {year.active ? " (active)" : ""}
                    </option>
                  ))}
                </select>

                <div className="flex h-8 min-w-[155px] items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-medium text-slate-700">
                  Sites : Strelitzia School
                </div>

                <select
                  value={classe}
                  onChange={(e) => {
                    setClasse(e.target.value);
                    setSerie("TOUT");
                  }}
                  className="premium-select h-8 min-w-[150px] rounded-lg border border-slate-200 theme-dark-btn px-2.5 pr-7 text-[11px] font-medium text-white outline-none ring-blue-200 transition focus:ring-4"
                >
                  <option value="TOUT">Classe : TOUT</option>

                  {allClasses.map((c) => (
                    <option key={c.id} value={c.name}>
                      Classe : {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  className="premium-select h-8 min-w-[150px] rounded-lg border border-slate-200 theme-dark-btn px-2.5 pr-7 text-[11px] font-medium text-white outline-none ring-blue-200 transition focus:ring-4"
                >
                  <option value="TOUT">Série : TOUT</option>

                  {availableSeries.map((s) => (
                    <option key={s.id} value={s.name}>
                      Série : {s.name}
                    </option>
                  ))}
                </select>
              </div></div>
            </div>

            <div className="search-card border-b border-slate-200 bg-white p-1.5 md:p-2">
              <div className="student-toolbar-scroll"><div className="student-toolbar-inner flex gap-2 items-center justify-between">
                <div className="flex flex-1 gap-2">
                  <div className="relative w-full max-w-[260px]">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 pr-9 text-[11px] font-normal outline-none shadow-sm ring-blue-200 transition placeholder:text-slate-400 focus:ring-4"
                      placeholder="Rechercher un étudiant..."
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
                  </div>

                  <button
                    onClick={() => loadStudents(selectedYear)}
                    className="h-8 rounded-lg theme-dark-btn px-3.5 text-[11px] font-medium text-white shadow-sm transition hover:brightness-110"
                  >
                    🔍 Rechercher
                  </button>

                  <button
                    onClick={resetFilters}
                    className="h-8 rounded-lg bg-red-500 px-3.5 text-[11px] font-medium text-white shadow-sm transition hover:bg-red-600"
                  >
                    ⟳ Initialiser
                  </button>
                </div>

                <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  Total : <span className="text-blue-700">{filtered.length}</span>
                </div>
              </div></div>
            </div>

            <div className="table-scroll relative max-h-[calc(100vh-185px)] min-h-[500px] overflow-auto bg-white">
              {loadingStudents && students.length === 0 && (
                <div className="student-loading-mini">
                  <div className="student-loading-spinner" />
                  <span>Chargement étudiants...</span>
                </div>
              )}
              <table className="student-table w-full min-w-[1120px] border-separate border-spacing-0 text-[10.5px] font-medium tracking-tight">
                <thead className="sticky top-0 z-30 theme-dark-btn text-white shadow-lg">
                  <tr>
                    {[
                      "M°",
                      "Site",
                      "AS",
                      "Date inscription",
                      "Nom",
                      "Prénom(s)",
                      "Sexe",
                      "Classe",
                      "Section",
                      "Contact",
                      "Date Naiss.",
                      "Lieu Naiss.",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`border-b border-r border-white/10 theme-dark-btn px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${
                          h === "Action" ? "sticky-action-col w-[58px] min-w-[58px] text-center" : ""
                        } ${["Site", "AS", "Date Naiss.", "Lieu Naiss."].includes(h) ? "mobile-hide" : ""}`}
                      >
                        {h === "Action" ? "Action" : `${h} ↕`}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-10 text-center text-[13px] font-medium text-slate-500">
                        Aucun étudiant trouvé
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr
                        key={s.id}
                        className={`border-b transition hover:bg-blue-50 ${
                          String(s.id) === String(highlightId)
                            ? "bg-amber-50"
                            : "odd:bg-white even:bg-slate-50/70"
                        }`}
                      >
                        <td className="border-b border-r border-slate-200 px-2 py-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openStudentRecap(s)}
                            className="rounded-lg px-1.5 py-0.5 font-black text-blue-700 transition hover:bg-blue-50 hover:text-blue-900 hover:underline"
                            title="Voir le récapitulatif étudiant"
                          >
                            {s.matricule}
                          </button>
                        </td>
                        <td className="mobile-hide border-b border-r border-slate-200 px-2 py-1.5 whitespace-nowrap">
                          {s.site}
                        </td>
                        <td className="mobile-hide border-b border-r border-slate-200 px-2 py-1.5 whitespace-nowrap">
                          {s.anneeScolaire}
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-1.5 whitespace-nowrap">
                          {formatDate(s.dateInscription)}
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-1.5 font-black text-slate-900 whitespace-nowrap">
                          {s.nom}
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-1.5 whitespace-nowrap">
                          {s.prenoms}
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-1.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 font-bold text-blue-700">
                            {s.sexe?.toLowerCase().startsWith("m") ? "♂" : s.sexe?.toLowerCase().startsWith("f") ? "♀" : ""}
                            {s.sexe}
                          </span>
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-1.5 font-bold whitespace-nowrap">
                          {s.classe}
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-1.5 whitespace-nowrap">
                          {s.section}
                        </td>
                        <td className="border-b border-r border-slate-200 px-2 py-1.5 whitespace-nowrap">
                          {s.contact || "-"}
                        </td>
                        <td className="mobile-hide border-b border-r border-slate-200 px-2 py-1.5 whitespace-nowrap">
                          {formatDate(s.dateNaissance)}
                        </td>
                        <td className="mobile-hide border-b border-r border-slate-200 px-2 py-1.5 whitespace-nowrap">
                          {s.lieuNaissance || "-"}
                        </td>

                        <td className="sticky-action-col border-b border-slate-200 bg-white px-2 py-1.5 text-center">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => setOpenActionId(openActionId === s.id ? null : s.id)}
                              className="mobile-action-btn grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-[16px] font-black text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-95"
                            >
                              ⋮
                            </button>

                            {openActionId === s.id && (
                              <>
                                <div onClick={() => setOpenActionId(null)} className="fixed inset-0 z-40" />

                                <div className="absolute right-0 top-full z-[9999] mt-2 w-[225px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionId(null);
                                      window.location.href = `/user/student/${s.id}`;
                                    }}
                                    className="w-full px-4 py-3 text-left text-[12px] font-bold transition hover:bg-slate-50"
                                  >
                                    🧑 Information de l’étudiant
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionId(null);
                                      window.location.href = `/user/reinscription?studentId=${s.id}`;
                                    }}
                                    className="w-full px-4 py-3 text-left text-[12px] font-bold transition hover:bg-slate-50"
                                  >
                                    ↻ Réinscription
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionId(null);
                                      alert("Marquer étudiant bientôt");
                                    }}
                                    className="w-full px-4 py-3 text-left text-[12px] font-bold transition hover:bg-slate-50"
                                  >
                                    📑 Marquer l’étudiant
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionId(null);
                                      alert("Transfert bientôt");
                                    }}
                                    className="w-full px-4 py-3 text-left text-[12px] font-bold transition hover:bg-slate-50"
                                  >
                                    🔁 Transférer à un site
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionId(null);
                                      deleteStudent(s.id);
                                    }}
                                    className="w-full px-4 py-3 text-left text-[12px] font-semibold text-red-600 transition hover:bg-red-50"
                                  >
                                    🗑 Supprimer
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 md:flex-row md:items-center md:justify-between">
              <span>
                Affichage de 1 à {filtered.length} sur {filtered.length} étudiant{filtered.length > 1 ? "s" : ""}
              </span>

              <div className="flex items-center gap-2">
                <span>Lignes par page</span>
                <select className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold outline-none">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <button className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50">‹</button>
                <button className="grid h-9 w-9 place-items-center rounded-xl theme-button font-black text-white shadow-sm">1</button>
                <button className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50">›</button>
              </div>
            </div>
          </div>
        </div>


        {themePanelOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-2  md:p-4">
            <div className="flex max-h-[94vh] w-full max-w-[1060px] flex-col overflow-hidden rounded-[30px] border border-white/15 bg-white shadow-[0_18px_44px_rgba(2,6,23,.38)]">
              <div className="theme-sidebar relative overflow-hidden p-5 text-white md:p-6">
                <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-white/10" />
                <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-white/10" />

                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[.30em] text-white/60">Paramètres professionnels</p>
                    <h2 className="mt-1 text-[24px] font-black leading-tight md:text-[32px]">Thème & apparence</h2>
                    <p className="mt-2 max-w-[700px] text-[13px] font-semibold leading-relaxed text-white/70">
                      Gérez le style complet de l'application : couleur principale, menu latéral, boutons, filtres et vue étudiants.
                    </p>
                  </div>
                  <button
                    onClick={() => setThemePanelOpen(false)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-lg font-black hover:bg-white/20"
                    aria-label="Fermer paramètres thème"
                  >
                    ✕
                  </button>
                </div>

                <div className="relative mt-5 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-inner">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-white/55">Thème actif</div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-[22px]">{currentTheme.icon}</span>
                      <div>
                        <p className="text-[14px] font-black">{currentTheme.name}</p>
                        <p className="text-[11px] font-medium text-white/60">{currentTheme.label}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-white/55">Couleur noire</div>
                    <p className="mt-2 text-[13px] font-black">Noir Élégant disponible</p>
                    <p className="mt-1 text-[11px] font-semibold text-white/60">Style sombre, luxe et premium.</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-white/55">Sidebar</div>
                    <p className="mt-2 text-[13px] font-black">Menu responsive</p>
                    <p className="mt-1 text-[11px] font-semibold text-white/60">Recherche menu + fermeture mobile.</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-white/55">Vue étudiants</div>
                    <p className="mt-2 text-[13px] font-black">Table claire compacte</p>
                    <p className="mt-1 text-[11px] font-semibold text-white/60">Lisible sur PC et téléphone.</p>
                  </div>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 overflow-hidden bg-slate-50 md:grid-cols-[245px_1fr]">
                <aside className="border-b border-slate-200 bg-white p-3 md:border-b-0 md:border-r md:p-4">
                  <div className="grid grid-cols-4 gap-2 md:grid-cols-1">
                    {[
                      { key: "themes", icon: "🎨", title: "Couleurs", desc: "Choix des thèmes" },
                      { key: "preview", icon: "🧭", title: "Menu", desc: "Aperçu sidebar" },
                      { key: "studentView", icon: "👨‍🎓", title: "Vue étudiants", desc: "Table + boutons" },
                      { key: "font", icon: "🔠", title: "Police", desc: "Agrandir ou réduire" },
                    ].map((tab) => {
                      const active = themeSettingsTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setThemeSettingsTab(tab.key as "themes" | "preview" | "studentView" | "font")}
                          className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                            active
                              ? "border-slate-900 bg-slate-950 text-white shadow-lg"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[18px]">{tab.icon}</span>
                            <span className="text-[12px] font-semibold md:text-[13px]">{tab.title}</span>
                          </div>
                          <p className={`mt-1 hidden text-[10px] font-bold md:block ${active ? "text-white/55" : "text-slate-400"}`}>{tab.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 md:block">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sauvegarde</p>
                    <p className="mt-2 text-[12px] font-bold leading-relaxed text-slate-600">
                      Le thème choisi est enregistré automatiquement sur cet appareil.
                    </p>
                  </div>
                </aside>

                <main className="min-h-0 overflow-y-auto p-4 md:p-5">
                  {themeSettingsTab === "themes" && (
                    <div>
                      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                          <h3 className="text-[20px] font-black text-slate-950">Bibliothèque de thèmes</h3>
                          <p className="mt-1 text-[12px] font-medium text-slate-500">Sélectionnez une couleur professionnelle pour toute l'application.</p>
                        </div>
                        <span className="w-fit rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {appThemes.length} thèmes disponibles
                        </span>
                      </div>

                      <div className="mb-5 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                        <div className="grid gap-0 lg:grid-cols-[1fr_330px]">
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[.24em] text-slate-400">Espace étudiants</p>
                                <h4 className="mt-1 text-[18px] font-black text-slate-950">Couleur de la page Liste des étudiants</h4>
                                <p className="mt-1 max-w-[620px] text-[13px] font-bold leading-relaxed text-slate-500">
                                  Choisissez une ambiance professionnelle pour le fond de la page où s’affiche la liste des étudiants.
                                </p>
                              </div>

                              <div
                                className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 shadow-inner ring-4 ring-slate-100"
                                style={{ backgroundColor: studentPageColor }}
                                title="Couleur actuelle de l’espace étudiants"
                              />
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_92px]">
                              <label className="block">
                                <span className="text-[12px] font-semibold text-slate-700">Palette professionnelle</span>
                                <select
                                  value={studentPageColor}
                                  onChange={(e) => applyStudentPageColor(e.target.value)}
                                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-black text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-100"
                                >
                                  {studentPageColorPresets.map((preset) => (
                                    <option key={preset.value} value={preset.value}>
                                      {preset.name} — {preset.description}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="block">
                                <span className="text-[12px] font-semibold text-slate-700">Libre</span>
                                <input
                                  type="color"
                                  value={studentPageColor}
                                  onChange={(e) => applyStudentPageColor(e.target.value)}
                                  className="mt-2 h-12 w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-1 shadow-sm"
                                  aria-label="Choisir une couleur personnalisée pour l’espace étudiants"
                                />
                              </label>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={resetStudentPageColor}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                              >
                                Reprendre la couleur du thème actif
                              </button>

                              <button
                                type="button"
                                onClick={() => applyStudentPageColor(DEFAULT_STUDENT_PAGE_COLOR)}
                                className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110"
                              >
                                Réinitialiser
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-slate-400">Aperçu</p>
                            <div
                              className="mt-3 rounded-[22px] border border-slate-200 p-3 shadow-inner"
                              style={{ backgroundColor: studentPageColor }}
                            >
                              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="mb-3 h-2 w-20 rounded-full theme-gradient" />
                                <div className="text-[14px] font-black text-slate-950">Liste des étudiants</div>
                                <div className="mt-2 grid gap-2">
                                  <div className="h-8 rounded-xl bg-slate-100" />
                                  <div className="h-8 rounded-xl bg-white border border-slate-100" />
                                  <div className="h-8 rounded-xl bg-slate-100" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {appThemes.map((theme) => {
                          const active = theme.key === themeKey;
                          return (
                            <button
                              key={theme.key}
                              onClick={() => applyTheme(theme.key)}
                              className={`group overflow-hidden rounded-[24px] border bg-white p-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                                active ? "border-slate-950 ring-4 ring-slate-950/10" : "border-slate-200"
                              }`}
                            >
                              <div
                                className="relative h-28 overflow-hidden rounded-[20px] border border-white/50 shadow-inner"
                                style={{ background: `linear-gradient(135deg, ${theme.dark}, ${theme.primary}, ${theme.primary2})` }}
                              >
                                <div className="absolute left-3 top-3 h-8 w-24 rounded-xl bg-white/20" />
                                <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-2">
                                  <div className="h-8 rounded-xl bg-white/25" />
                                  <div className="h-8 rounded-xl bg-white/15" />
                                  <div className="h-8 rounded-xl bg-white/10" />
                                </div>
                              </div>

                              <div className="mt-3 flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[13px] font-black text-slate-950">{theme.icon} {theme.name}</p>
                                  <p className="mt-1 text-[10px] font-medium text-slate-500">{theme.label}</p>
                                </div>
                                {active ? (
                                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">ACTIF</span>
                                ) : (
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">CHOISIR</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {themeSettingsTab === "preview" && (
                    <div>
                      <h3 className="text-[20px] font-black text-slate-950">Aperçu du menu latéral</h3>
                      <p className="mt-1 text-[12px] font-medium text-slate-500">Le thème choisi s'applique au sidebar, aux menus actifs et aux boutons.</p>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[290px_1fr]">
                        <div className="theme-sidebar overflow-hidden rounded-[26px] p-4 text-white shadow-xl">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 font-black">S</div>
                            <div>
                              <p className="text-[14px] font-black">Strelitzia School</p>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Menu preview</p>
                            </div>
                          </div>
                          {menus.slice(0, 4).map((menu) => (
                            <div key={menu.title} className="mb-3">
                              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/35">{menu.title}</p>
                              {menu.items.slice(0, 3).map((item, index) => (
                                <div
                                  key={item}
                                  className={`mb-1 rounded-2xl px-3 py-2 text-[12px] font-bold ${index === 0 ? "bg-white text-slate-950" : "text-white/70"}`}
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>

                        <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Paramètre menu</p>
                          <h4 className="mt-2 text-[20px] font-black text-slate-950">Sidebar professionnel</h4>
                          <p className="mt-2 text-[13px] font-bold leading-relaxed text-slate-600">
                            Le menu reste compact, clair, avec recherche interne des menus seulement. Sur mobile, il s'ouvre et se ferme proprement.
                          </p>
                          <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700">Recherche menu</span>
                            <span className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700">Responsive mobile</span>
                            <span className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700">Mode noir inclus</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {themeSettingsTab === "studentView" && (
                    <div>
                      <h3 className="text-[20px] font-black text-slate-950">Aperçu vue étudiants</h3>
                      <p className="mt-1 text-[12px] font-medium text-slate-500">Le thème s'applique aux actions, filtres, en-têtes et badges.</p>

                      <div className="mt-4 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                        <div className="theme-gradient p-4 text-white">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-white/70">Liste des étudiants</p>
                              <h4 className="text-[22px] font-black">Vue compacte professionnelle</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button className="rounded-xl bg-white/20 px-3 py-2 text-[11px] font-semibold">Actualiser</button>
                              <button className="rounded-xl bg-white/20 px-3 py-2 text-[11px] font-semibold">Excel</button>
                              <button className="rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-slate-950">Imprimer</button>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="grid gap-2 md:grid-cols-4">
                            {["Recherche", "Année", "Classe", "Série"].map((label) => (
                              <div key={label} className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] font-semibold text-slate-400">{label}</div>
                            ))}
                          </div>
                          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                            <div className="theme-dark-btn grid grid-cols-4 gap-2 px-3 py-3 text-[10px] font-semibold uppercase text-white">
                              <span>Matricule</span><span>Nom</span><span>Classe</span><span>Action</span>
                            </div>
                            {[1, 2, 3].map((row) => (
                              <div key={row} className="grid grid-cols-4 gap-2 border-t border-slate-100 px-3 py-3 text-[11px] font-medium text-slate-700">
                                <span>MAT-00{row}</span><span>Étudiant {row}</span><span>GRADE {row}</span><span>Détails</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                  {themeSettingsTab === "font" && (
                    <div>
                      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                          <h3 className="text-[20px] font-black text-slate-950">Taille de police globale</h3>
                          <p className="mt-1 text-[12px] font-medium text-slate-500">
                            Appuyez sur + ou - pour agrandir/réduire tous les textes de l’interface : sidebar, boutons, filtres, tableau et aperçu étudiants.
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Actuel : {activeFontScaleName} • {fontPercent}%
                        </span>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
                        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Réglage rapide</p>
                          <div className="mt-4 flex items-center justify-center gap-4">
                            <button
                              type="button"
                              onClick={decreaseFontScale}
                              disabled={fontScale <= MIN_FONT_SCALE}
                              className="grid h-16 w-16 place-items-center rounded-3xl border border-slate-200 bg-white text-[28px] font-black text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Réduire la police"
                            >
                              −
                            </button>

                            <div className="min-w-[130px] rounded-3xl border border-slate-200 bg-slate-950 px-5 py-4 text-center text-white shadow-xl">
                              <div className="text-[30px] font-black leading-none">{fontPercent}%</div>
                              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/55">{activeFontScaleName}</div>
                            </div>

                            <button
                              type="button"
                              onClick={increaseFontScale}
                              disabled={fontScale >= MAX_FONT_SCALE}
                              className="grid h-16 w-16 place-items-center rounded-3xl border border-slate-200 theme-button text-[28px] font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Agrandir la police"
                            >
                              +
                            </button>
                          </div>

                          <input
                            type="range"
                            min={MIN_FONT_SCALE}
                            max={MAX_FONT_SCALE}
                            step={FONT_SCALE_STEP}
                            value={fontScale}
                            onChange={(e) => applyFontScale(Number(e.target.value))}
                            className="mt-6 w-full accent-slate-950"
                          />

                          <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                            <span>Petit</span>
                            <span>Normal</span>
                            <span>Grand</span>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => applyFontScale(1)}
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-800 transition hover:bg-white"
                            >
                              Réinitialiser
                            </button>
                            <button
                              type="button"
                              onClick={() => applyFontScale(1.25)}
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                            >
                              Mode lecture
                            </button>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                          <div className="theme-dark-btn flex items-center justify-between px-4 py-3 text-white">
                            <span className="text-[11px] font-semibold uppercase tracking-wide">Aperçu direct de toute l’interface</span>
                            <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold">{fontPercent}%</span>
                          </div>
                          <div className="p-4">
                            <div className="mb-3 flex flex-wrap gap-2">
                              <button className="theme-button rounded-xl px-3 py-2 text-[11px] font-semibold text-white">Bouton principal</button>
                              <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800">Bouton secondaire</button>
                              <input className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold outline-none" value="Recherche étudiant" readOnly />
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                              <table className="student-table w-full min-w-[650px] border-separate border-spacing-0">
                                <thead className="theme-dark-btn text-white">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Matricule</th>
                                    <th className="px-3 py-2 text-left">Nom</th>
                                    <th className="px-3 py-2 text-left">Classe</th>
                                    <th className="px-3 py-2 text-left">Contact</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="bg-white">
                                    <td className="border-t border-slate-200 px-3 py-2 font-black text-red-500">MAT-001</td>
                                    <td className="border-t border-slate-200 px-3 py-2 font-black text-slate-900">Exemple Étudiant</td>
                                    <td className="border-t border-slate-200 px-3 py-2 font-medium text-slate-700">GRADE 1</td>
                                    <td className="border-t border-slate-200 px-3 py-2 text-slate-700">034 00 000 00</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <p className="mt-4 text-[12px] font-bold leading-relaxed text-slate-500">
                              Ce réglage est sauvegardé automatiquement et s’applique à toute la page, pas seulement au tableau.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </main>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
                <p className="text-[12px] font-medium text-slate-500">
                  Thème actif : <b className="text-slate-900">{currentTheme.name}</b> — Police : <b className="text-slate-900">{activeFontScaleName} ({fontPercent}%)</b> — sauvegarde automatique.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => applyFontScale(1)}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-[12px] font-semibold text-slate-900 shadow-lg hover:bg-slate-50"
                  >
                    Police standard
                  </button>
                  <button
                    onClick={() => applyTheme("black")}
                    className="rounded-xl border border-slate-200 bg-slate-950 px-5 py-3 text-[12px] font-semibold text-white shadow-lg hover:brightness-110"
                  >
                    Activer Noir Élégant
                  </button>
                  <button
                    onClick={() => setThemePanelOpen(false)}
                    className="theme-button rounded-xl px-5 py-3 text-[12px] font-semibold text-white shadow-lg hover:brightness-110"
                  >
                    Valider le thème
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {studentRecapOpen && selectedStudent && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/70 p-2 md:p-4">
            <div className="flex max-h-[94vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-[0_24px_70px_rgba(2,6,23,.45)]">
              <div className="theme-sidebar relative overflow-hidden p-4 text-white md:p-5">
                <div className="absolute -right-20 -top-24 h-52 w-52 rounded-full bg-white/10" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[.26em] text-white/55">Information étudiant</p>
                    <h2 className="mt-1 truncate text-[22px] font-black md:text-[28px]">
                      {selectedStudent.nom} {selectedStudent.prenoms}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white">M° {selectedStudent.matricule}</span>
                      <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white">{selectedStudent.classe || "Classe -"}</span>
                      <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white">{selectedStudent.section || "Série -"}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStudentRecapOpen(false)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-[18px] font-black text-white transition hover:bg-white/20"
                    aria-label="Fermer information étudiant"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto bg-slate-50 p-3 md:p-5">
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-[15px] font-black text-slate-950">Informations étudiant</h3>
                      <p className="text-[11px] font-medium text-slate-500">Récapitulatif simple affiché au clic sur le matricule.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => printStudentInfo(selectedStudent)}
                      className="w-fit rounded-xl theme-button px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:brightness-110"
                    >
                      ⎙ Imprimer PDF
                    </button>
                  </div>

                  <div className="grid gap-2 p-4 text-[12px]">
                    {[
                      ["Matricule", selectedStudent.matricule],
                      ["Site", selectedStudent.site],
                      ["Année scolaire", selectedStudent.anneeScolaire],
                      ["Date inscription", formatDate(selectedStudent.dateInscription)],
                      ["Nom", selectedStudent.nom],
                      ["Prénom(s)", selectedStudent.prenoms],
                      ["Sexe", selectedStudent.sexe],
                      ["Classe", selectedStudent.classe],
                      ["Série / Section", selectedStudent.section],
                      ["Contact", selectedStudent.contact || "-"],
                      ["Date de naissance", formatDate(selectedStudent.dateNaissance)],
                      ["Lieu de naissance", selectedStudent.lieuNaissance || "-"],
                      ["Père", selectedStudent.pereNom || "-"],
                      ["Mère", selectedStudent.mereNom || "-"],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[125px_1fr] gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 md:grid-cols-[155px_1fr]">
                        <span className="font-black text-slate-500">{label}</span>
                        <span className="font-bold text-slate-950">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {profilePanelOpen && (
          <div className="fixed inset-0 z-[100000] flex items-end justify-center bg-slate-950/65 p-0 sm:items-center sm:p-3">
            <div className="flex max-h-[95vh] w-full max-w-[780px] flex-col overflow-hidden rounded-t-[22px] border border-white/15 bg-white shadow-[0_20px_60px_rgba(2,6,23,.40)] sm:rounded-[24px]">
              <div className="theme-sidebar relative overflow-hidden px-3.5 py-3 text-white sm:px-4">
                <div className="absolute -right-14 -top-16 h-36 w-36 rounded-full bg-white/10" />
                <div className="absolute -bottom-20 left-1/3 h-36 w-36 rounded-full bg-cyan-300/10" />

                <div className="relative flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-md ring-2 ring-white/10 sm:h-14 sm:w-14">
                      {currentProfilePhoto ? (
                        <img src={currentProfilePhoto} alt={currentUser.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-cyan-500 to-slate-950 text-base font-semibold text-white sm:text-lg">
                          {getUserInitials(currentUser.name, currentUser.email)}
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[9px] font-medium uppercase tracking-[.18em] text-white/55">Mon profil</p>
                     <div className="mt-0.5 break-words text-[14px] font-medium leading-snug text-white sm:text-[15px] md:text-[16px]">
                        {currentUser.name}
                      </div>
                      <p className="mt-0.5 max-w-[210px] truncate text-[11px] font-normal text-white/65 sm:max-w-none sm:text-xs">
                        {currentUser.email}
                      </p>
                      <div className="absolute right-12 top-0 flex flex-col items-end gap-1">
                        <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
                          {currentRoleLabel}
                        </span>

                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[9px] font-medium text-emerald-100">
                          Actif
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setProfilePanelOpen(false)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 text-sm font-medium hover:bg-white/20"
                    aria-label="Fermer profil"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {profileMessage && (
                <div className="border-b border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[11px] font-medium text-emerald-700">
                  ✅ {profileMessage}
                </div>
              )}

              <div className="min-h-0 overflow-y-auto bg-slate-50 p-2.5 sm:p-3">
                <div className="grid gap-2.5 lg:grid-cols-[245px_1fr]">
                  <aside className="space-y-2.5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div>
                        <h3 className="text-[13px] font-semibold text-slate-950">Photo de profil</h3>
                        <p className="mt-0.5 text-[10.5px] font-normal leading-snug text-slate-500">
                          Visible dans le dashboard et l’espace admin.
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 lg:flex-col lg:items-center">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-900 shadow-inner ring-2 ring-slate-200 sm:h-20 sm:w-20">
                          {currentProfilePhoto ? (
                            <img src={currentProfilePhoto} alt={currentUser.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-cyan-500 to-slate-950 text-xl font-semibold text-white">
                              {getUserInitials(currentUser.name, currentUser.email)}
                            </div>
                          )}
                        </div>

                        <div className="grid flex-1 gap-1.5 lg:w-full">
                          <label className="w-full cursor-pointer rounded-xl bg-slate-950 px-3 py-2 text-center text-[11px] font-medium text-white shadow-sm transition hover:bg-slate-800">
                            {uploadingProfilePhoto ? "Traitement..." : "Changer photo"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingProfilePhoto}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                uploadConnectedUserPhoto(file);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>

                          {currentProfilePhoto && (
                            <button
                              type="button"
                              onClick={removeConnectedUserPhoto}
                              disabled={uploadingProfilePhoto}
                              className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <h3 className="text-[13px] font-semibold text-slate-950">Résumé du compte</h3>
                      <div className="mt-2.5 grid gap-1.5 text-[11px]">
                        <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                          <p className="text-[9.5px] font-medium uppercase tracking-wide text-slate-400">Nom</p>
                          <p className="mt-0.5 truncate font-medium text-slate-950">{currentUser.name}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                          <p className="text-[9.5px] font-medium uppercase tracking-wide text-slate-400">Email</p>
                          <p className="mt-0.5 break-all font-normal text-slate-700">{currentUser.email}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                          <p className="text-[9.5px] font-medium uppercase tracking-wide text-slate-400">Rôle</p>
                          <p className="mt-0.5 font-medium text-slate-950">{currentRoleLabel}</p>
                        </div>
                      </div>
                    </div>
                  </aside>

                  <div className="space-y-2.5">
                    <form onSubmit={saveConnectedUserName} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-[13px] font-semibold text-slate-950 sm:text-sm">Informations personnelles</h3>
                          <p className="mt-0.5 text-[10.5px] font-normal leading-snug text-slate-500">
                            Modifier le nom affiché. L’email reste le login.
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-blue-50 px-2.5 py-1 text-[9.5px] font-medium text-blue-700">Identité</span>
                      </div>

                      <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                        <label className="block">
                          <span className="text-[11px] font-medium text-slate-700">Nom complet</span>
                          <input
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-medium text-slate-700">Email login</span>
                          <input
                            value={currentUser.email}
                            readOnly
                            className="mt-1 h-9 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 text-[13px] font-normal text-slate-500 outline-none"
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex flex-col gap-1.5 sm:flex-row">
                        <button
                          type="submit"
                          disabled={savingProfileName}
                          className="rounded-xl bg-slate-950 px-4 py-2 text-[11px] font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {savingProfileName ? "Enregistrement..." : "Enregistrer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileName(currentUser.name)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>

                    <form onSubmit={changeConnectedUserPassword} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-[13px] font-semibold text-slate-950 sm:text-sm">Sécurité du compte</h3>
                          <p className="mt-0.5 text-[10.5px] font-normal leading-snug text-slate-500">
                            Changez votre mot de passe personnel.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowProfilePasswords((v) => !v)}
                          className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-medium text-slate-700 hover:bg-white"
                        >
                          {showProfilePasswords ? "🙈 Masquer" : "👁 Voir"}
                        </button>
                      </div>

                      <div className="mt-3 grid gap-2.5">
                        <label className="block">
                          <span className="text-[11px] font-medium text-slate-700">Mot de passe actuel</span>
                          <input
                            type={showProfilePasswords ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                          />
                        </label>

                        <div className="grid gap-2.5 md:grid-cols-2">
                          <label className="block">
                            <span className="text-[11px] font-medium text-slate-700">Nouveau mot de passe</span>
                            <input
                              type={showProfilePasswords ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                          </label>

                          <label className="block">
                            <span className="text-[11px] font-medium text-slate-700">Confirmer le mot de passe</span>
                            <input
                              type={showProfilePasswords ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                          </label>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                          <div className="flex items-center justify-between text-[9.5px] font-medium uppercase tracking-wide text-slate-500">
                            <span>Force du mot de passe</span>
                            <span>{profilePasswordScore.label}</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <div className={`h-full ${profilePasswordScore.color} transition-all`} style={{ width: profilePasswordScore.width }} />
                          </div>
                          <p className="mt-1.5 text-[10px] font-normal text-slate-500">
                            Conseil : minimum 8 caractères avec chiffre et majuscule.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-1.5 sm:flex-row">
                        <button
                          type="submit"
                          disabled={savingProfilePassword}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-[11px] font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
                        >
                          {savingProfilePassword ? "Modification..." : "Modifier mot de passe"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Initialiser
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 md:px-6">
          <div className="flex items-center justify-between gap-2">
            <span>
              Connecté : <b>{currentUser.name}</b> — {currentRoleLabel}
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="hidden sm:block">Strelitzia School © 2026</span>
          </div>
        </footer>
      </section>
    </main>
  );
}
