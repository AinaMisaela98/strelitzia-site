"use client";

import { useEffect, useMemo, useState } from "react";

type Treasury = {
  id: number;
  name: string;
  type?: string | null;
  active?: boolean | null;
  principal?: boolean | null;
  isPrincipal?: boolean | null;
  isDefault?: boolean | null;
  default?: boolean | null;
};

type SchoolYear = {
  id?: number | string;
  name: string;
  active?: boolean | null;
};

type Movement = {
  id: number | string;
  treasuryId: number;
  movementType: "ENTREE" | "SORTIE" | "CREDIT" | "DEBIT" | string;
  type?: "CREDIT" | "DEBIT" | string | null;
  sens?: string | null;
  operation?: string | null;
  nature?: string | null;
  category: string;
  categorie?: string | null;
  amount: number;
  montant?: number | null;
  debit?: number | null;
  credit?: number | null;
  motif?: string | null;
  libelle?: string | null;
  description?: string | null;
  reference?: string | null;
  studentId?: number | null;
  studentFeeId?: number | null;
  trainingFeeId?: number | null;
  schoolYearName?: string | null;
  createdBy?: string | null;
  createdAt: string;
  treasury?: Treasury | null;
  student?: {
    id: number;
    matricule?: string | null;
    nom?: string | null;
    prenoms?: string | null;
    classe?: string | null;
    section?: string | null;
  } | null;
  studentName?: string | null;
  studentMatricule?: string | null;
  studentClasse?: string | null;
  studentSection?: string | null;
  studentClassLabel?: string | null;
  feeLabel?: string | null;
  feeCode?: string | null;
  feeAmount?: number | null;
  studentFee?: {
    id: number | string;
    libelle?: string | null;
    code?: string | null;
    montantTotal?: number | null;
    montantPaye?: number | null;
    reste?: number | null;
    status?: string | null;
    studentId?: number | null;
    trainingFeeId?: number | null;
  } | null;
  trainingFee?: {
    id: number | string;
    libelle?: string | null;
    code?: string | null;
    montant?: number | null;
  } | null;
};

const SITE_NAME = "Strelitzia School";
const DEFAULT_YEAR = "2025-2026";

function money(value: number | string | null | undefined) {
  return `${new Intl.NumberFormat("fr-FR").format(Number(value || 0))} Ar`;
}

function todayInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentInsertionDateTime() {
  // Heure normale locale du navigateur: date + heure + minute + seconde + milliseconde.
  // Io no ampiasaina amin'ny ordre d'insertion, fa tsy ilay date opérationnelle fidian'ny utilisateur.
  const now = new Date();
  const day = todayInput();
  return `${day}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMovementDayKey(value?: string | null) {
  return toInputDate(value) || todayInput();
}

function getSummaryDateLabel(from: string, to: string) {
  if (from && to && from === to) return formatDateFR(from);
  if (from && to) return `${formatDateFR(from)} au ${formatDateFR(to)}`;
  if (from) return `Depuis ${formatDateFR(from)}`;
  if (to) return `Jusqu'au ${formatDateFR(to)}`;
  return "Toutes les dates";
}

function formatDateFR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR");
}

function formatDateTimeFR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("fr-FR");
}

function parseAmount(value: string) {
  return Number(String(value || "0").replace(/\s/g, "").replace(/[^\d]/g, "")) || 0;
}

function formatInputAmount(value: string) {
  return String(value || "")
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function getErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object") {
    const item = data as { error?: unknown; message?: unknown };
    if (typeof item.error === "string" && item.error.trim()) return item.error;
    if (typeof item.message === "string" && item.message.trim()) return item.message;
  }
  return fallback;
}

function getMovementLabel(m: Pick<Movement, "category" | "movementType">) {
  const category = normalizeCategory(m.category);
  if (category === "PAIEMENT_FRAIS") return "Paiement frais de formation";
  if (category === "ANNULATION_PAIEMENT_FRAIS") return "ANNULATION - frais de formation";
  if (category === "ENTREE_MANUELLE") return "Entrée manuelle";
  if (category === "DEPENSE") return "Dépense";
  if (category === "TRANSFERT") return "Transfert";
  return category || m.movementType || "-";
}

function normalizeMovementType(type?: string | null) {
  const value = cleanText(type).toUpperCase();
  if (["ENTREE", "CREDIT", "CRÉDIT", "IN", "INCOME"].includes(value)) return "ENTREE";
  if (["SORTIE", "DEBIT", "DÉBIT", "OUT", "EXPENSE"].includes(value)) return "SORTIE";
  return value;
}

function getRawMovementType(m: Pick<Movement, "movementType" | "type" | "sens" | "operation">) {
  return m.movementType || m.type || m.sens || m.operation || "";
}

function isCreditMovement(m: Partial<Movement>) {
  return getStableMovementType(m) === "ENTREE";
}

function isDebitMovement(m: Partial<Movement>) {
  return getStableMovementType(m) === "SORTIE";
}

function normalizeCategory(category?: string | null) {
  const value = cleanText(category).toUpperCase();
  if (["ANNULATION", "ANNULATION_FRAIS", "ANNULATION_PAIEMENT", "ANNULATION_PAIEMENT_FRAIS", "ANNULATION_FRAIS_DE_FORMATION", "CANCEL_PAYMENT"].includes(value)) {
    return "ANNULATION_PAIEMENT_FRAIS";
  }
  if (["FRAIS", "FRAIS_DE_FORMATION", "ECOLAGE", "ÉCOLAGE", "PAIEMENT", "PAIEMENT_FRAIS", "PAIEMENT_FRAIS_DE_FORMATION", "PAIEMENT_ECOLAGE", "PAIEMENT_ÉCOLAGE"].includes(value)) {
    return "PAIEMENT_FRAIS";
  }
  return value;
}

function isFeeMovement(m: Pick<Movement, "category" | "studentFeeId" | "trainingFeeId" | "studentFee" | "trainingFee" | "feeLabel" | "feeCode" | "description">) {
  const category = normalizeCategory(m.category);
  if (category === "PAIEMENT_FRAIS" || category === "ANNULATION_PAIEMENT_FRAIS") return true;
  if (m.studentFeeId || m.trainingFeeId || m.studentFee || m.trainingFee) return true;
  if (cleanText(m.feeLabel) || cleanText(m.feeCode)) return true;
  return /frais|écolage|ecolage|annulation\s+paiement/i.test(cleanText(m.description));
}

function getMovementTypeLabel(type?: string | null) {
  const normalized = normalizeMovementType(type);
  if (normalized === "ENTREE") return "CREDIT";
  if (normalized === "SORTIE") return "DEBIT";
  return cleanText(type) || "-";
}

function getPaymentModeFromDescription(description?: string | null) {
  const d = cleanText(description);
  if (/mvola/i.test(d)) return "Mvola";
  if (/orange/i.test(d)) return "Orange Money";
  if (/virement/i.test(d)) return "Virement";
  if (/ch[eè]que/i.test(d)) return "Chèque";
  if (/esp[eè]ce/i.test(d)) return "Espèce";
  return "-";
}

function getStudentName(m: Movement) {
  const fromApi = cleanText(m.studentName);
  if (fromApi && fromApi !== "-") return fromApi;
  const fullName = `${m.student?.nom || ""} ${m.student?.prenoms || ""}`.trim();
  return fullName || "-";
}

function getStudentMatricule(m: Movement) {
  return cleanText(m.studentMatricule) || cleanText(m.student?.matricule) || "-";
}

function getStudentClass(m: Movement) {
  const fromApi = cleanText(m.studentClassLabel);
  if (fromApi && fromApi !== "-") return fromApi;
  const classe = cleanText(m.studentClasse) || cleanText(m.student?.classe);
  const section = cleanText(m.studentSection) || cleanText(m.student?.section);
  if (!classe && !section) return "-";
  return `${classe || "-"}${section ? ` / ${section}` : ""}`;
}

function getFeeLabelFromMovement(m: Movement) {
  const direct = cleanText(m.feeLabel);
  if (direct && direct !== "-") return direct;

  const studentFeeLabel = cleanText(m.studentFee?.libelle);
  if (studentFeeLabel && studentFeeLabel !== "-") return studentFeeLabel;

  const trainingFeeLabel = cleanText(m.trainingFee?.libelle);
  if (trainingFeeLabel && trainingFeeLabel !== "-") return trainingFeeLabel;

  const desc = cleanText(m.description);
  if (normalizeCategory(m.category) === "PAIEMENT_FRAIS" && desc) {
    return desc.replace(/^Paiement\s+frais\s*/i, "").replace(/\s*-\s*$/, "").trim() || "Paiement frais";
  }

  return getMovementLabel(m);
}

function getFeeCodeFromMovement(m: Movement) {
  const direct = cleanText(m.feeCode);
  if (direct && direct !== "-") return direct;

  const studentFeeCode = cleanText(m.studentFee?.code);
  if (studentFeeCode && studentFeeCode !== "-") return studentFeeCode;

  const trainingFeeCode = cleanText(m.trainingFee?.code);
  if (trainingFeeCode && trainingFeeCode !== "-") return trainingFeeCode;

  return m.category || "-";
}

function getFeePaidAmount(m: Movement) {
  return Number(m.feeAmount ?? m.studentFee?.montantPaye ?? m.trainingFee?.montant ?? m.amount ?? 0);
}

function getMovementRealAmount(m: Partial<Movement>) {
  const debit = Number(m.debit || 0);
  const credit = Number(m.credit || 0);
  const amount = Number(m.amount ?? m.montant ?? m.feeAmount ?? 0);

  if (debit > 0) return debit;
  if (credit > 0) return credit;
  return amount;
}


function getMovementInsertionTime(m: Partial<Movement>) {
  // Ordre logique global: izay action voasoratra FARANY no ambony,
  // na mouvement manuel, na paiement frais, na annulation, debit na credit.
  // Tsy ampiasaina intsony ny "date" paiement ho tri principal satria mety daty taloha izy.
  const candidates = [
    (m as any).insertedAt,
    (m as any).insertionDateTime,
    (m as any).dateInsertionTime,
    (m as any).createdAt,
    (m as any).created_at,
    (m as any).updatedAt,
  ];

  for (const value of candidates) {
    const timestamp = new Date(String(value || "")).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }

  const idText = String(m.id || "");
  const numericParts = idText.match(/\d{10,}/g) || [];
  const lastNumeric = numericParts.length ? Number(numericParts[numericParts.length - 1]) : NaN;
  if (Number.isFinite(lastNumeric)) return lastNumeric;

  return 0;
}

function getStableMovementType(m: Partial<Movement>) {
  const category = normalizeCategory(m.category || m.categorie || "");
  const raw = normalizeMovementType(getRawMovementType(m as any));
  const debit = Number(m.debit || 0);
  const credit = Number(m.credit || 0);

  // PRIORITÉ ABSOLUE AU TYPE EXPLICITE.
  // Important ho an'ny "Nouveau Mouvement": raha misafidy DEBIT ny utilisateur,
  // dia DEBIT foana no aseho na inona na inona Motif/Catégorie nofidiana.
  // Raha misafidy CREDIT dia CREDIT foana koa.
  if (raw === "SORTIE") return "SORTIE";
  if (raw === "ENTREE") return "ENTREE";

  // Raha tsy misy type explicite dia debit/credit montant no mamaritra.
  if (debit > 0 && credit <= 0) return "SORTIE";
  if (credit > 0 && debit <= 0) return "ENTREE";

  // Fallback ho an'ny anciennes données frais izay tsy manana type/debit/credit mazava.
  if (category === "ANNULATION_PAIEMENT_FRAIS") return "SORTIE";
  if (category === "PAIEMENT_FRAIS") return "ENTREE";

  return raw;
}

function getMovementStorageKey(movementOrId: Movement | number | string | null | undefined) {
  if (movementOrId === null || movementOrId === undefined) return "";

  // Rehefa string/number no omena dia id direct io.
  if (typeof movementOrId === "string" || typeof movementOrId === "number") return String(movementOrId);

  const m = movementOrId;
  const realId = cleanText(m.id);
  if (isRealDatabaseId(realId)) return realId;

  // Stable key: tsy miankina amin'ny id fake generated, mba tsy hiteraka doublon
  // raha tonga avy amin'ny API sy localStorage ilay mouvement mitovy.
  return [
    cleanText(m.reference).toUpperCase(),
    getMovementDayKey(m.createdAt),
    Number(m.treasuryId || 0),
    getStableMovementType(m),
    normalizeCategory(m.category || m.categorie || ""),
    Number(m.studentId || m.student?.id || 0),
    Number(m.studentFeeId || m.studentFee?.id || 0),
    Number(m.trainingFeeId || m.trainingFee?.id || 0),
    cleanText(m.feeCode || m.studentFee?.code || m.trainingFee?.code).toUpperCase(),
    getMovementRealAmount(m),
  ].join("|");
}

function getMovementDeleteKeys(movementOrId: Movement | number | string | null | undefined) {
  if (movementOrId === null || movementOrId === undefined) return [] as string[];
  if (typeof movementOrId === "string" || typeof movementOrId === "number") {
    return [String(movementOrId)];
  }

  const keys = new Set<string>();
  keys.add(String(movementOrId.id || ""));
  keys.add(getMovementStorageKey(movementOrId));
  return Array.from(keys).filter(Boolean);
}

function isRealDatabaseId(id: number | string | null | undefined) {
  if (id === null || id === undefined) return false;
  return /^\d+$/.test(String(id));
}

function getDeletedMovementIds() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const parsed = JSON.parse(localStorage.getItem("deletedTreasuryMovementIds") || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function saveDeletedMovementId(id: number | string) {
  if (typeof window === "undefined") return;
  const key = String(id);
  const ids = getDeletedMovementIds();
  if (!ids.includes(key)) {
    localStorage.setItem("deletedTreasuryMovementIds", JSON.stringify([...ids, key]));
  }
}

function saveDeletedMovementKeys(keys: string[]) {
  if (typeof window === "undefined") return;
  const current = new Set(getDeletedMovementIds());
  keys.forEach((key) => {
    if (key) current.add(String(key));
  });
  localStorage.setItem("deletedTreasuryMovementIds", JSON.stringify(Array.from(current)));
}

function removeLocalTreasuryMovement(idOrMovement: Movement | number | string) {
  if (typeof window === "undefined") return;
  try {
    const deleteKeys = new Set(getMovementDeleteKeys(idOrMovement));
    const rawLocal = localStorage.getItem("treasuryMovements");
    const parsedLocal = rawLocal ? JSON.parse(rawLocal) : [];
    const list = Array.isArray(parsedLocal) ? parsedLocal : [];
    const filtered = list.filter((item: any) => {
      const itemKeys = getMovementDeleteKeys(item);
      return !itemKeys.some((key) => deleteKeys.has(key));
    });
    localStorage.setItem("treasuryMovements", JSON.stringify(filtered));
  } catch {
    // Tsy manakana suppression raha localStorage misy erreur.
  }
}

export default function TreasuryMovementsPage() {
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [search, setSearch] = useState("");
  const [site, setSite] = useState(SITE_NAME);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [loadingSchoolYears, setLoadingSchoolYears] = useState(true);
  const [schoolYearName, setSchoolYearName] = useState("");

  const [formDate, setFormDate] = useState(todayInput());
  const [formTreasuryId, setFormTreasuryId] = useState("");
  const [formType, setFormType] = useState<"CREDIT" | "DEBIT" | "">("");
  const [formAmount, setFormAmount] = useState("");
  const [formReference, setFormReference] = useState(`TR-${Date.now()}`);
  const [formMotif, setFormMotif] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const [filterFrom, setFilterFrom] = useState(todayInput());
  const [filterTo, setFilterTo] = useState(todayInput());
  const [filterMatricule, setFilterMatricule] = useState("");
  const [filterClasse, setFilterClasse] = useState("");
  const [filterTreasury, setFilterTreasury] = useState("");
  const [filterMovementType, setFilterMovementType] = useState("TOUT");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPaymentMode, setFilterPaymentMode] = useState("");

  const activeTreasuries = useMemo(() => treasuries.filter((t) => t.active !== false), [treasuries]);

  const mainActiveTreasury = useMemo(() => {
    return (
      activeTreasuries.find((t) => t.principal === true || t.isPrincipal === true || t.isDefault === true || t.default === true) ||
      activeTreasuries[0] ||
      treasuries[0] ||
      null
    );
  }, [activeTreasuries, treasuries]);

  useEffect(() => {
    if (!formTreasuryId && mainActiveTreasury?.id) {
      setFormTreasuryId(String(mainActiveTreasury.id));
    }
  }, [formTreasuryId, mainActiveTreasury]);

  useEffect(() => {
    let cancelled = false;

    async function loadSchoolYears() {
      try {
        setLoadingSchoolYears(true);

        const res = await fetch(`/api/school-years?_ts=${Date.now()}`, {
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        const list: SchoolYear[] = Array.isArray(json)
          ? json
          : Array.isArray(json.schoolYears)
            ? json.schoolYears
            : Array.isArray(json.data)
              ? json.data
              : [];

        if (cancelled) return;

        const cleanedList = list.filter((item) => String(item?.name || "").trim());
        setSchoolYears(cleanedList);

        const activeYear =
          cleanedList.find((item) => item.active === true)?.name ||
          cleanedList[0]?.name ||
          DEFAULT_YEAR;

        setSchoolYearName((current) => current || activeYear);
      } catch {
        if (!cancelled) {
          setSchoolYears([{ name: DEFAULT_YEAR, active: true }]);
          setSchoolYearName((current) => current || DEFAULT_YEAR);
        }
      } finally {
        if (!cancelled) setLoadingSchoolYears(false);
      }
    }

    loadSchoolYears();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadData() {
    if (!schoolYearName) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("schoolYearName", schoolYearName);

      const [treasuryRes, movementRes] = await Promise.all([
        fetch(`/api/treasuries?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/treasury-movements?${params.toString()}`, { cache: "no-store" }),
      ]);

      const treasuryJson = await treasuryRes.json().catch(() => ({}));
      const movementJson = await movementRes.json().catch(() => ({}));

      if (!treasuryRes.ok) throw new Error(getErrorMessage(treasuryJson, "Erreur chargement trésoreries"));
      if (!movementRes.ok) throw new Error(getErrorMessage(movementJson, "Erreur chargement mouvements"));

      const loadedTreasuries = Array.isArray(treasuryJson.treasuries) ? treasuryJson.treasuries : [];
      setTreasuries(loadedTreasuries);

      const activeMain =
        loadedTreasuries.find((t: Treasury) => t.active !== false && (t.principal === true || t.isPrincipal === true || t.isDefault === true || t.default === true)) ||
        loadedTreasuries.find((t: Treasury) => t.active !== false) ||
        loadedTreasuries[0];
      if (activeMain?.id && !formTreasuryId) {
        setFormTreasuryId(String(activeMain.id));
      }
      const apiMovements = Array.isArray(movementJson.movements) ? movementJson.movements : [];
      let localMovements: Movement[] = [];
      try {
        const rawLocal = localStorage.getItem("treasuryMovements");
        const parsedLocal = rawLocal ? JSON.parse(rawLocal) : [];
        localMovements = Array.isArray(parsedLocal) ? parsedLocal : [];
      } catch {
        localMovements = [];
      }

      const deletedIds = new Set(getDeletedMovementIds());

      // API no source principale. LocalStorage ampiasaina fallback ihany.
      // Raha mitovy reference/date/trésorerie/type/montant dia tazonina ilay API record
      // mba tsy hisy duplication amin'ny affichage.
      const merged = [...localMovements, ...apiMovements];
      const unique = new Map<string, Movement>();

      for (const rawItem of merged) {
        const item = {
          ...rawItem,
          amount: getMovementRealAmount(rawItem),
          movementType: getStableMovementType(rawItem) === "SORTIE" ? "DEBIT" : "CREDIT",
          type: getStableMovementType(rawItem) === "SORTIE" ? "DEBIT" : "CREDIT",
          sens: getStableMovementType(rawItem) === "SORTIE" ? "DEBIT" : "CREDIT",
          operation: getStableMovementType(rawItem) === "SORTIE" ? "DEBIT" : "CREDIT",
          category: normalizeCategory(rawItem.category || rawItem.categorie || rawItem.category),
        } as Movement;

        const itemKeys = getMovementDeleteKeys(item);
        if (itemKeys.some((key) => deletedIds.has(key))) continue;

        const key = getMovementStorageKey(item);
        if (!key) continue;

        const existing = unique.get(key);
        const existingIsReal = existing ? isRealDatabaseId(existing.id) : false;
        const itemIsReal = isRealDatabaseId(item.id);

        // Raha misy doublon: real DB id no prioritaire, sinon ilay vao farany no tazonina.
        if (!existing || (!existingIsReal && itemIsReal)) {
          unique.set(key, item);
        }
      }

      setMovements(
        Array.from(unique.values()).sort((a, b) => {
          const db = getMovementInsertionTime(b);
          const da = getMovementInsertionTime(a);
          if (db !== da) return db - da;
          return String(b.id || "").localeCompare(String(a.id || ""), "fr", { numeric: true });
        })
      );
    } catch (error) {
      console.error("TREASURY_MOVEMENTS_LOAD_ERROR", error);
      alert(error instanceof Error ? error.message : "Erreur chargement mouvements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYearName]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const m of movements) if (m.category) set.add(normalizeCategory(m.category));
    return Array.from(set).sort();
  }, [movements]);

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = filterFrom ? new Date(`${filterFrom}T00:00:00`) : null;
    const to = filterTo ? new Date(`${filterTo}T23:59:59`) : null;

    return movements
      .filter((m) => {
        const insertionTimestamp = getMovementInsertionTime(m);
        const created = insertionTimestamp > 0 ? new Date(insertionTimestamp) : new Date(m.createdAt);
        const paymentMode = getPaymentModeFromDescription(m.description);
        const studentName = getStudentName(m);
        const studentMatricule = getStudentMatricule(m);
        const studentClass = getStudentClass(m);

        if (from && !Number.isNaN(created.getTime()) && created < from) return false;
        if (to && !Number.isNaN(created.getTime()) && created > to) return false;
        if (filterTreasury && String(m.treasuryId) !== filterTreasury) return false;
        if (filterMovementType !== "TOUT" && getMovementTypeLabel(getStableMovementType(m)) !== filterMovementType) return false;
        if (filterCategory && normalizeCategory(m.category) !== normalizeCategory(filterCategory)) return false;
        if (filterPaymentMode && paymentMode.toLowerCase() !== filterPaymentMode.toLowerCase()) return false;
        if (filterMatricule && !studentMatricule.toLowerCase().includes(filterMatricule.toLowerCase())) return false;
        if (filterClasse && !studentClass.toLowerCase().includes(filterClasse.toLowerCase())) return false;

        const haystack = [
          m.reference,
          m.category,
          getMovementLabel(m),
          m.description,
          m.movementType,
          m.treasury?.name,
          m.schoolYearName,
          m.createdBy,
          studentName,
          studentMatricule,
          studentClass,
          getFeeLabelFromMovement(m),
          getFeeCodeFromMovement(m),
          paymentMode,
        ]
          .filter((v) => v !== null && v !== undefined)
          .join(" ")
          .toLowerCase();

        if (q && !haystack.includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        // Affichage demandé: izay mouvement inseré farany no miseho ambony.
        // Mifototra amin'ny createdAt/date d'insertion, ary fallback amin'ny timestamp ao amin'ny id raha local/generated.
        const db = getMovementInsertionTime(b);
        const da = getMovementInsertionTime(a);
        if (db !== da) return db - da;

        return String(b.id || "").localeCompare(String(a.id || ""), "fr", { numeric: true });
      });
  }, [
    movements,
    search,
    filterFrom,
    filterTo,
    filterTreasury,
    filterMovementType,
    filterCategory,
    filterPaymentMode,
    filterMatricule,
    filterClasse,
  ]);

  const totalCredit = filteredMovements
    .filter((m) => isCreditMovement(m))
    .reduce((sum, m) => sum + getMovementRealAmount(m), 0);

  const totalDebit = filteredMovements
    .filter((m) => isDebitMovement(m))
    .reduce((sum, m) => sum + getMovementRealAmount(m), 0);

  const solde = totalCredit - totalDebit;

  const realBalanceByTreasury = useMemo(() => {
    const map = new Map<number, { name: string; debit: number; credit: number; solde: number }>();

    for (const m of filteredMovements) {
      const key = Number(m.treasuryId || 0);
      const current = map.get(key) || {
        name: m.treasury?.name || `Trésorerie ${key || "-"}`,
        debit: 0,
        credit: 0,
        solde: 0,
      };

      if (isCreditMovement(m)) current.credit += getMovementRealAmount(m);
      if (isDebitMovement(m)) current.debit += getMovementRealAmount(m);
      current.solde = current.credit - current.debit;
      map.set(key, current);
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredMovements]);

  const realGlobalSolde = realBalanceByTreasury.reduce((sum, item) => sum + item.solde, 0);

  const balanceByMovement = useMemo(() => {
    const map = new Map<string, { before: number; after: number; debit: number; credit: number }>();

    // Logique demandée:
    // - Chaque journée repart à 0.
    // - Dans une même journée, le solde avant reprend le solde après de la ligne précédente.
    // - La dernière insertion de la journée porte donc le compte final du jour.
    // - Le calcul reste séparé par trésorerie pour ne pas mélanger Caisse, Banque, MVola, etc.
    const runningByTreasuryAndDay = new Map<string, number>();

    [...movements]
      .sort((a, b) => {
        const dayA = getMovementDayKey(new Date(getMovementInsertionTime(a) || Date.now()).toISOString());
        const dayB = getMovementDayKey(new Date(getMovementInsertionTime(b) || Date.now()).toISOString());
        if (dayA !== dayB) return dayA.localeCompare(dayB);

        const treasuryA = Number(a.treasuryId || 0);
        const treasuryB = Number(b.treasuryId || 0);
        if (treasuryA !== treasuryB) return treasuryA - treasuryB;

        const da = getMovementInsertionTime(a);
        const db = getMovementInsertionTime(b);
        if (da !== db) return da - db;

        return String(a.id || "").localeCompare(String(b.id || ""), "fr", { numeric: true });
      })
      .forEach((m) => {
        const treasuryKey = Number(m.treasuryId || 0);
        const dayKey = getMovementDayKey(new Date(getMovementInsertionTime(m) || Date.now()).toISOString());
        const runningKey = `${treasuryKey}-${dayKey}`;
        const previous = runningByTreasuryAndDay.get(runningKey) || 0;
        const amount = getMovementRealAmount(m);
        const debit = isDebitMovement(m) ? amount : 0;
        const credit = isCreditMovement(m) ? amount : 0;
        const before = previous;
        const after = previous - debit + credit;

        runningByTreasuryAndDay.set(runningKey, after);
        map.set(getMovementStorageKey(m), { before, after, debit, credit });
      });

    return map;
  }, [movements]);

  async function saveMovement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    const treasuryId = Number(formTreasuryId);
    const amount = parseAmount(formAmount);

    if (!treasuryId) return alert("Choisissez une trésorerie.");
    if (!formType) return alert("Choisissez le type du mouvement.");
    if (!amount || amount <= 0) return alert("Montant invalide.");

    setSaving(true);
    try {
      const selectedType: "CREDIT" | "DEBIT" = formType === "DEBIT" ? "DEBIT" : "CREDIT";
      const category = formMotif || (selectedType === "CREDIT" ? "ENTREE_MANUELLE" : "DEPENSE");
      const movementLabel = formDescription || getMovementLabel({ category, movementType: selectedType });
      const movementDate = formDate || todayInput();
      // Date d'insertion réelle: c'est l'heure exacte de l'enregistrement.
      // Elle sert au tri global avec TOUS les mouvements.
      const insertionDateTime = currentInsertionDateTime();

      const stableReference =
        String(formReference || "").trim() ||
        [
          "TR",
          schoolYearName,
          treasuryId,
          selectedType,
          movementDate,
          amount,
          category,
          movementLabel,
        ]
          .map((item) => String(item ?? "").trim().replace(/\\s+/g, "-"))
          .join("-");

      const idempotencyKey = [
        "MANUAL_TREASURY_MOVEMENT",
        schoolYearName,
        treasuryId,
        selectedType,
        amount,
        movementDate,
        stableReference,
      ]
        .map((item) => String(item ?? "").trim())
        .join("|");

      const payload = {
        treasuryId,

        // TYPE FORCÉ PAR LE CHOIX UTILISATEUR, PAS PAR LE MOTIF.
        // CREDIT sélectionné => CREDIT foana.
        // DEBIT sélectionné => DEBIT foana.
        movementType: selectedType,
        type: selectedType,
        sens: selectedType,
        operation: selectedType,
        nature: selectedType,

        category,
        categorie: category,
        amount,
        montant: amount,
        debit: selectedType === "DEBIT" ? amount : 0,
        credit: selectedType === "CREDIT" ? amount : 0,
        description: movementLabel,
        motif: movementLabel,
        libelle: movementLabel,
        reference: stableReference,
        idempotencyKey,
        schoolYearName,
        // "date" garde la date métier choisie dans le formulaire.
        date: movementDate,
        datePaiement: movementDate,
        movementDate,

        // "createdAt/insertedAt" garde l'ordre réel d'insertion.
        dateInsertion: todayInput(),
        createdAt: insertionDateTime,
        insertedAt: insertionDateTime,
        insertionTime: insertionDateTime,
        actionAt: insertionDateTime,
        movementOrderAt: insertionDateTime,
        sortAt: insertionDateTime,
        updatedAt: insertionDateTime,
      };

      const res = await fetch("/api/treasury-movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getErrorMessage(data, "Erreur enregistrement mouvement"));


      setShowNewModal(false);
      // Affichage filtré par vraie date/heure d'insertion:
      // rehefa mamorona mouvement vaovao dia aseho avy hatrany amin'ny Aujourd'hui.
      setFilterFrom(todayInput());
      setFilterTo(todayInput());
      setFormDate(todayInput());
      setFormTreasuryId(mainActiveTreasury?.id ? String(mainActiveTreasury.id) : "");
      setFormType("");
      setFormAmount("");
      setFormReference(`TR-${Date.now()}`);
      setFormMotif("");
      setFormDescription("");
      await loadData();
    } catch (error) {
      console.error("TREASURY_MOVEMENT_SAVE_ERROR", error);
      alert(error instanceof Error ? error.message : "Erreur enregistrement mouvement");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMovement(id: number | string) {
    const target = movements.find((item) => String(item.id) === String(id) || getMovementStorageKey(item) === String(id));
    const movementId = String(id || "").trim();
    const deleteKeys = getMovementDeleteKeys(target || movementId);

    if (!movementId && deleteKeys.length === 0) return alert("ID mouvement introuvable.");
    if (!confirm("Supprimer ce mouvement ?")) return;

    try {
      const realId = target && isRealDatabaseId(target.id) ? String(target.id) : isRealDatabaseId(movementId) ? movementId : "";

      if (realId) {
        const res = await fetch(`/api/treasury-movements?id=${encodeURIComponent(realId)}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(getErrorMessage(data, "Erreur suppression mouvement"));
      }

      // Na real DB na id texte: soratana ao anaty liste supprimée ny id sy stable key
      // mba tsy hiverina miseho indray rehefa refresh.
      saveDeletedMovementKeys(deleteKeys.length ? deleteKeys : [movementId]);
      removeLocalTreasuryMovement(target || movementId);

      setMovements((prev) =>
        prev.filter((item) => {
          const itemKeys = getMovementDeleteKeys(item);
          return !itemKeys.some((key) => (deleteKeys.length ? deleteKeys : [movementId]).includes(key));
        })
      );

      if (realId) await loadData();
    } catch (error) {
      console.error("TREASURY_MOVEMENT_DELETE_ERROR", error);
      alert(error instanceof Error ? error.message : "Erreur suppression mouvement");
    }
  }

  function resetFilters() {
    const today = todayInput();
    setFilterFrom(today);
    setFilterTo(today);
    setFilterMatricule("");
    setFilterClasse("");
    setFilterTreasury("");
    setFilterMovementType("TOUT");
    setFilterCategory("");
    setFilterPaymentMode("");
    setSearch("");
  }

  function exportCsv() {
    const headers = [
      "A-S",
      "Date",
      "Reference",
      "Caisse",
      "Matricule",
      "MOTIF",
      "Nom",
      "TYPE",
      "CODE",
      "Mode Paiement",
      "Solde avant",
      "DEBIT",
      "CREDIT",
      "Solde après",
      "Utilisateur",
      "Date Enregistrement",
    ];

    const rows = filteredMovements.map((m) => {
      const balance = balanceByMovement.get(getMovementStorageKey(m)) || { before: 0, debit: 0, credit: 0, after: 0 };
      return [
        m.schoolYearName || schoolYearName,
        formatDateFR(m.createdAt),
        m.reference || "",
        m.treasury?.name || "-",
        getStudentMatricule(m),
        getFeeLabelFromMovement(m),
        `${getStudentName(m)}${getStudentClass(m) !== "-" ? ` - ${getStudentClass(m)}` : ""}`,
        getMovementTypeLabel(m.movementType),
        getFeeCodeFromMovement(m),
        getPaymentModeFromDescription(m.description),
        balance.before,
        balance.debit,
        balance.credit,
        balance.after,
        m.createdBy || "",
        formatDateTimeFR(m.createdAt),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tresorerie-mouvements-eleves.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen max-w-full overflow-x-hidden bg-white p-2 text-[12px] text-slate-900 md:p-4">
      <style>{`
        .movement-table-scroll {
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #64748b #e2e8f0;
        }

        .movement-table-scroll::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }

        .movement-table-scroll::-webkit-scrollbar-track {
          background: #e2e8f0;
          border-radius: 999px;
        }

        .movement-table-scroll::-webkit-scrollbar-thumb {
          background: #64748b;
          border-radius: 999px;
        }

        @media screen and (max-width: 768px) {
          .movement-table-scroll {
            max-height: calc(100dvh - 320px) !important;
            border-radius: 10px !important;
          }

          .movement-table-scroll table {
            min-width: 1380px !important;
          }

          .movement-table-scroll th,
          .movement-table-scroll td {
            line-height: 1.15 !important;
          }
        }
      `}</style>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 border-b border-slate-300 pb-2 md:flex-row md:items-center md:justify-between">
          <h1 className="text-[18px] font-normal text-slate-800">
            Historique du Trésorerie ({filteredMovements.length})
          </h1>

          <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="h-[30px] w-full rounded-[3px] bg-cyan-600 px-2 text-[11px] sm:w-auto sm:px-3 sm:text-[12px] font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              ⟳ {loading ? "Chargement" : "Actualiser"}
            </button>

            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="h-[30px] w-full rounded-[3px] border border-slate-800 bg-slate-800 px-2 text-[11px] sm:w-auto sm:text-[12px] font-semibold text-white"
            >
              <option value={SITE_NAME}>Sites : Strelitzia School</option>
            </select>

            <select
              value={schoolYearName}
              onChange={(e) => setSchoolYearName(e.target.value)}
              disabled={loadingSchoolYears || !schoolYearName}
              className="h-[30px] w-full rounded-[3px] border border-slate-800 bg-slate-800 px-2 text-[11px] sm:w-auto sm:text-[12px] font-semibold text-white disabled:opacity-70"
            >
              {schoolYears.length > 0 ? (
                schoolYears.map((year) => (
                  <option key={year.name} value={year.name}>
                    Année scolaire : {year.name}{year.active ? " (active)" : ""}
                  </option>
                ))
              ) : (
                <option value={schoolYearName || DEFAULT_YEAR}>
                  Année scolaire : {schoolYearName || DEFAULT_YEAR}
                </option>
              )}
            </select>

            <button
              type="button"
              onClick={exportCsv}
              className="h-[30px] w-full rounded-[3px] bg-blue-600 px-2 text-[11px] sm:w-auto sm:px-3 sm:text-[12px] font-semibold text-white hover:bg-blue-700"
            >
              Export Excel
            </button>

            <button
              type="button"
              onClick={() => {
                setFormTreasuryId((current) => current || (mainActiveTreasury?.id ? String(mainActiveTreasury.id) : ""));
                setShowNewModal(true);
              }}
              className="h-[30px] w-full rounded-[3px] border border-slate-800 bg-white px-2 text-[11px] sm:w-auto sm:px-3 sm:text-[12px] font-semibold text-slate-800 hover:bg-slate-100"
            >
              ⊕ Nouveau Mouvement
            </button>
          </div>
        </div>

        <div className="rounded-[6px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-slate-800 px-3 py-2 text-white">
            <div className="font-bold">Résumé des mouvements</div>
            <div className="text-[10px] text-slate-200">Paiement frais = CREDIT • Annulation frais = DEBIT</div>
          </div>

          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
            <div className="rounded-[6px] border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-emerald-700">Total Crédit</div>
              <div className="mt-1 text-[18px] font-black text-emerald-700">{money(totalCredit)}</div>
            </div>
            <div className="rounded-[6px] border border-red-200 bg-red-50 p-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-red-700">Total Débit</div>
              <div className="mt-1 text-[18px] font-black text-red-700">{money(totalDebit)}</div>
            </div>
            <div
              className={
                realGlobalSolde >= 0
                  ? "rounded-[6px] border border-slate-200 bg-slate-900 p-3 text-white shadow-sm"
                  : "rounded-[6px] border-2 border-red-500 bg-red-700 p-3 text-white shadow-sm"
              }
            >
              <div className={realGlobalSolde >= 0 ? "text-[10px] uppercase tracking-wide text-slate-300" : "text-[10px] uppercase tracking-wide text-red-100"}>
                Solde du filtre/date
              </div>
              <div className={realGlobalSolde >= 0 ? "mt-1 text-[18px] font-black text-white" : "mt-1 text-[18px] font-black text-white"}>
                {money(realGlobalSolde)}
              </div>
              {realGlobalSolde < 0 && (
                <div className="mt-1 rounded bg-white/15 px-2 py-1 text-[10px] font-bold text-white">
                  ⚠ Solde négatif : perte / compte en moins
                </div>
              )}
            </div>
          </div>

          <div className="border-t px-3 py-2">
            <div className="grid grid-cols-[150px_1fr] gap-y-1 text-[11px]">
              <span className="text-slate-500">Date du résumé</span>
              <span className="font-semibold text-slate-800">{getSummaryDateLabel(filterFrom, filterTo)}</span>
              <span className="text-slate-500">Trésorerie filtrée</span>
              <span className="font-semibold text-blue-700">
                {filterTreasury
                  ? treasuries.find((t) => String(t.id) === filterTreasury)?.name || "TOUT"
                  : "TOUT"}
              </span>
              <span className="text-slate-500">Type mouvement</span>
              <span className="font-semibold text-blue-700">{filterMovementType}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-cyan-200 bg-cyan-50 p-2">
            <span className="text-[11px] font-bold text-cyan-900">Affichage par date d'insertion</span>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => {
                setFilterFrom(e.target.value);
                setFilterTo(e.target.value);
              }}
              className="h-[30px] border border-cyan-300 bg-white px-2 text-[12px] font-semibold text-slate-800 outline-none focus:border-cyan-600"
            />
            <button
              type="button"
              onClick={() => {
                const today = todayInput();
                setFilterFrom(today);
                setFilterTo(today);
              }}
              className="h-[30px] rounded-[3px] bg-cyan-600 px-3 text-[11px] font-semibold text-white hover:bg-cyan-700"
            >
              Aujourd'hui
            </button>
          </div>

          <div className="flex w-full items-center gap-2 md:w-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="rechercher élève, frais, matricule, classe..."
              className="h-[34px] min-w-0 flex-1 border border-slate-300 px-2 outline-none focus:border-cyan-600 md:h-[30px] md:max-w-[320px]"
            />
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className="h-[30px] w-[28px] rounded-[3px] bg-cyan-600 text-white hover:bg-cyan-700"
              title="Filtrer"
            >
              ▼
            </button>
          </div>
        </div>

        <div className="movement-table-scroll block max-h-[70vh] w-full overflow-auto rounded-[6px] border border-slate-300 bg-white shadow-sm md:max-h-none">
          <table className="w-full min-w-[1580px] border-collapse text-[9.5px] md:text-[10.5px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-800 text-left text-white">
                {[
                  "A-S",
                  "Date",
                  "Reference",
                  "Caisse",
                  "Matricule",
                  "MOTIF",
                  "Nom",
                  "TYPE",
                  "CODE",
                  "Mode Paiement",
                  "Solde avant",
                  "DEBIT",
                  "CREDIT",
                  "Solde après",
                  "Utilisateur",
                  "Date Enregistrement",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="border border-slate-600 px-2 py-[5px] font-semibold whitespace-nowrap md:py-[6px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={17} className="border border-slate-300 bg-blue-50 py-3 text-center text-slate-500">
                    Aucun mouvement trouvé
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const studentName = getStudentName(m);
                  const matricule = getStudentMatricule(m);
                  const studentClass = getStudentClass(m);
                  const feeLabel = getFeeLabelFromMovement(m);
                  const feeCode = getFeeCodeFromMovement(m);
                  const balance = balanceByMovement.get(getMovementStorageKey(m)) || { before: 0, debit: 0, credit: 0, after: 0 };
                  const modePaiement = getPaymentModeFromDescription(m.description);

                  return (
                    <tr key={m.id} className="hover:bg-cyan-50">
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1 whitespace-nowrap">{m.schoolYearName || schoolYearName}</td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1 whitespace-nowrap">{formatDateFR(m.createdAt)}</td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1">
                        <div className="max-w-[120px] truncate font-semibold text-slate-700" title={m.reference || ""}>
                          {m.reference || "-"}
                        </div>
                      </td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1">
                        <div className="max-w-[130px] truncate font-bold text-cyan-700" title={m.treasury?.name || ""}>
                          {m.treasury?.name || "-"}
                        </div>
                      </td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1 text-center font-semibold text-slate-800">{matricule}</td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1">
                        <div className="max-w-[230px] truncate font-semibold text-slate-900" title={feeLabel}>
                          {feeLabel}
                        </div>
                        {m.description && m.description !== feeLabel && (
                          <div className="max-w-[230px] truncate text-[9px] text-slate-500" title={m.description}>
                            {m.description}
                          </div>
                        )}
                      </td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1">
                        <div className="max-w-[190px] truncate font-bold text-blue-700" title={studentName}>
                          {studentName}
                        </div>
                        <div className="text-[9px] text-slate-600">
                          {matricule !== "-" ? `${matricule} • ` : ""}{studentClass}
                        </div>
                      </td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1 text-center">
                        <span
                          className={
                            isCreditMovement(m)
                              ? "inline-flex rounded-full bg-emerald-100 px-2 py-[2px] text-[9px] font-bold text-emerald-700"
                              : "inline-flex rounded-full bg-red-100 px-2 py-[2px] text-[9px] font-bold text-red-700"
                          }
                        >
                          {getMovementTypeLabel(getStableMovementType(m))}
                        </span>
                      </td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1 whitespace-nowrap">{feeCode}</td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1 whitespace-nowrap">{modePaiement}</td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1 text-right whitespace-nowrap">{money(balance.before)}</td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1 text-right font-bold text-red-700 whitespace-nowrap">
                        {balance.debit ? money(balance.debit) : "-"}
                      </td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {balance.credit ? money(balance.credit) : "-"}
                      </td>
                      <td
                        className={
                          balance.after >= 0
                            ? "border px-1.5 py-[3px] align-top md:px-2 md:py-1 text-right font-bold text-blue-700 whitespace-nowrap"
                            : "border px-1.5 py-[3px] align-top md:px-2 md:py-1 text-right font-black text-red-700 bg-red-50 whitespace-nowrap"
                        }
                      >
                        {money(balance.after)}
                        {balance.after < 0 && <div className="text-[8px] font-bold text-red-600">⚠ moins</div>}
                      </td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1">
                        <div className="max-w-[110px] truncate" title={m.createdBy || ""}>{m.createdBy || "-"}</div>
                      </td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1 whitespace-nowrap">{formatDateTimeFR((m as any).insertedAt || (m as any).insertionTime || (m as any).actionAt || m.createdAt)}</td>
                      <td className="border px-1.5 py-[3px] align-top md:px-2 md:py-1 text-center">
                        <button
                          type="button"
                          onClick={() => deleteMovement(m.id)}
                          className="rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                        >
                          Suppr.
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="hidden">
          {filteredMovements.map((m) => {
            const studentName = getStudentName(m);
            const matricule = getStudentMatricule(m);
            const studentClass = getStudentClass(m);
            const feeLabel = getFeeLabelFromMovement(m);
            const feeCode = getFeeCodeFromMovement(m);
            const isPaymentFee = isFeeMovement(m);
            const balance = balanceByMovement.get(getMovementStorageKey(m)) || { before: 0, debit: 0, credit: 0, after: 0 };

            return (
              <div key={`mobile-${m.id}`} className="w-full max-w-full overflow-hidden rounded-[6px] border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-[12px] font-bold text-slate-900">
                      {isPaymentFee ? feeLabel : getMovementLabel(m)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatDateTimeFR((m as any).insertedAt || (m as any).insertionTime || m.createdAt)} • {m.reference || `N° ${m.id}`} • {m.treasury?.name || "-"}
                    </p>
                  </div>
                  <span
                    className={
                      isCreditMovement(m)
                        ? "shrink-0 rounded-full bg-emerald-100 px-2 py-[2px] text-[10px] font-bold text-emerald-700"
                        : "shrink-0 rounded-full bg-red-100 px-2 py-[2px] text-[10px] font-bold text-red-700"
                    }
                  >
                    {getMovementTypeLabel(getStableMovementType(m))}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 text-[11px] min-[380px]:grid-cols-2">
                  <div>
                    <span className="text-slate-500">Élève</span>
                    <p className="font-semibold text-blue-700">{studentName}</p>
                    <p className="text-[10px] text-slate-500">{matricule} • {studentClass}</p>
                  </div>
                  <div className="text-left min-[380px]:text-right">
                    <span className="text-slate-500">Montant</span>
                    <p className={isCreditMovement(m) ? "font-black text-emerald-700" : "font-black text-red-700"}>
                      {money(getMovementRealAmount(m))}
                    </p>
                    <p className={balance.after >= 0 ? "text-[10px] text-slate-500" : "rounded bg-red-50 px-1 text-[10px] font-bold text-red-700"}>
                      Solde après: {money(balance.after)}
                      {balance.after < 0 ? " ⚠ moins" : ""}
                    </p>
                    <p className="text-[10px] text-slate-500">N° {m.id} • {m.treasury?.name || "-"}</p>
                  </div>
                </div>

                {isPaymentFee && feeCode && feeCode !== "-" && (
                  <div className="mt-2 rounded bg-slate-50 px-2 py-1 text-[10px] text-slate-600">
                    Code frais: <b>{feeCode}</b>
                  </div>
                )}
              </div>
            );
          })}
        </div>      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-2 py-4 md:px-3 md:pt-[90px]">
          <div className="w-full max-w-[640px] overflow-hidden rounded-[8px] bg-white shadow-2xl md:rounded-[3px]">
            <div className="flex h-[50px] items-center justify-between bg-slate-800 px-4 text-white">
              <h2 className="text-[16px] font-bold">Nouveau Mouvement</h2>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-slate-300 hover:text-white">×</button>
            </div>

            <form onSubmit={saveMovement} className="max-h-[calc(100dvh-110px)] overflow-y-auto p-3 md:p-4">
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span>Date</span>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="h-[26px] w-full border px-2" />
                </label>
                <label className="space-y-1">
                  <span>Type du Mouvement</span>
                  <select value={formType} onChange={(e) => setFormType(e.target.value as any)} className="h-[26px] w-full border px-2">
                    <option value="">Choisissez le type du mouvement</option>
                    <option value="CREDIT">CREDIT</option>
                    <option value="DEBIT">DEBIT</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span>Trésorerie</span>
                  <select value={formTreasuryId} onChange={(e) => setFormTreasuryId(e.target.value)} className="h-[26px] w-full border px-2">
                    {!mainActiveTreasury && <option value="">Choisissez une trésorerie</option>}
                    {activeTreasuries.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}{String(t.id) === String(mainActiveTreasury?.id) ? " (principale)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span>Montant</span>
                  <input
                    value={formatInputAmount(formAmount)}
                    onChange={(e) => setFormAmount(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    className="h-[26px] w-full border px-2 text-right"
                  />
                </label>
                <label className="space-y-1">
                  <span>Reference</span>
                  <input value={formReference} onChange={(e) => setFormReference(e.target.value)} className="h-[26px] w-full border px-2" />
                </label>
                <label className="space-y-1">
                  <span>Motif</span>
                  <select value={formMotif} onChange={(e) => setFormMotif(e.target.value)} className="h-[26px] w-full border px-2">
                    <option value="">Choisissez le motif</option>
                    <option value="PAIEMENT_FRAIS">Paiement frais</option>
                    <option value="ANNULATION_PAIEMENT_FRAIS">Annulation paiement frais</option>
                    <option value="ENTREE_MANUELLE">Entrée manuelle</option>
                    <option value="DEPENSE">Dépense</option>
                    <option value="TRANSFERT">Transfert</option>
                  </select>
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span>Description</span>
                  <input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="h-[26px] w-full border px-2" />
                </label>
              </div>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t pt-3 text-right sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowNewModal(false)} className="rounded-[3px] bg-slate-600 px-4 py-2 text-white">Fermer</button>
                <button disabled={saving} className="rounded-[3px] bg-blue-600 px-4 py-2 text-white disabled:opacity-60">
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-3 pt-[85px]">
          <div className="w-full max-w-[640px] overflow-hidden rounded-[2px] bg-white shadow-2xl">
            <div className="flex h-[48px] items-center justify-between bg-slate-800 px-3 text-white">
              <h2 className="text-[16px] font-bold">Filtrer Par</h2>
              <button type="button" onClick={() => setShowFilterModal(false)} className="text-slate-300 hover:text-white">×</button>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span>De</span>
                  <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="h-[26px] w-full border border-slate-300 px-2 text-right" />
                </label>
                <label className="space-y-1">
                  <span>Au</span>
                  <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="h-[26px] w-full border border-slate-300 px-2 text-right" />
                </label>
                <label className="space-y-1">
                  <span>Numero Matricule</span>
                  <input value={filterMatricule} onChange={(e) => setFilterMatricule(e.target.value)} className="h-[26px] w-full border border-slate-300 px-2" />
                </label>
                <label className="space-y-1">
                  <span>Classe / Série</span>
                  <input value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)} className="h-[26px] w-full border border-slate-300 px-2" />
                </label>
                <label className="space-y-1">
                  <span>Trésorerie</span>
                  <select value={filterTreasury} onChange={(e) => setFilterTreasury(e.target.value)} className="h-[26px] w-full border border-slate-300 px-2">
                    <option value="">Choisissez la trésorerie</option>
                    {treasuries.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span>Type mouvement</span>
                  <select value={filterMovementType} onChange={(e) => setFilterMovementType(e.target.value)} className="h-[26px] w-full border border-slate-300 px-2">
                    <option value="TOUT">TOUT</option>
                    <option value="CREDIT">CREDIT</option>
                    <option value="DEBIT">DEBIT</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span>Frais / Catégorie</span>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-[26px] w-full border border-slate-300 px-2">
                    <option value="">Toutes les catégories</option>
                    {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span>Mode paiement</span>
                  <select value={filterPaymentMode} onChange={(e) => setFilterPaymentMode(e.target.value)} className="h-[26px] w-full border border-slate-300 px-2">
                    <option value="">Tous</option>
                    <option value="Espèce">Espèce</option>
                    <option value="Mvola">Mvola</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Virement">Virement</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex flex-col-reverse gap-2 border-t pt-3 text-right sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowFilterModal(false)} className="rounded-[3px] bg-slate-600 px-4 py-2 text-white">Fermer</button>
                <button type="button" onClick={resetFilters} className="mr-2 rounded-[3px] bg-orange-500 px-4 py-2 text-white">Réinitialiser</button>
                <button type="button" onClick={() => setShowFilterModal(false)} className="rounded-[3px] bg-blue-600 px-4 py-2 text-white">Filtrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
