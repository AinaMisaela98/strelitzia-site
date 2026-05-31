"use client";

import { useEffect, useMemo, useState } from "react";

type Treasury = {
  id: number;
  name: string;
  type?: string | null;
  active?: boolean | null;
};

type Movement = {
  id: number;
  treasuryId: number;
  movementType: "ENTREE" | "SORTIE" | string;
  category: string;
  amount: number;
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
    id: number;
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
    id: number;
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

function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const category = cleanText(m.category);
  if (category === "PAIEMENT_FRAIS") return "Paiement frais";
  if (category === "ANNULATION_PAIEMENT_FRAIS") return "Annulation paiement frais";
  if (category === "ENTREE_MANUELLE") return "Entrée manuelle";
  if (category === "DEPENSE") return "Dépense";
  if (category === "TRANSFERT") return "Transfert";
  return category || m.movementType || "-";
}

function getMovementTypeLabel(type?: string | null) {
  if (type === "ENTREE") return "CREDIT";
  if (type === "SORTIE") return "DEBIT";
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
  if (m.category === "PAIEMENT_FRAIS" && desc) {
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

export default function TreasuryMovementsPage() {
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [search, setSearch] = useState("");
  const [site, setSite] = useState(SITE_NAME);
  const [schoolYearName, setSchoolYearName] = useState(DEFAULT_YEAR);

  const [formDate, setFormDate] = useState(todayInput());
  const [formTreasuryId, setFormTreasuryId] = useState("");
  const [formType, setFormType] = useState<"ENTREE" | "SORTIE" | "">("");
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

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (schoolYearName) params.set("schoolYearName", schoolYearName);

      const [treasuryRes, movementRes] = await Promise.all([
        fetch("/api/treasuries", { cache: "no-store" }),
        fetch(`/api/treasury-movements?${params.toString()}`, { cache: "no-store" }),
      ]);

      const treasuryJson = await treasuryRes.json().catch(() => ({}));
      const movementJson = await movementRes.json().catch(() => ({}));

      if (!treasuryRes.ok) throw new Error(getErrorMessage(treasuryJson, "Erreur chargement trésoreries"));
      if (!movementRes.ok) throw new Error(getErrorMessage(movementJson, "Erreur chargement mouvements"));

      setTreasuries(Array.isArray(treasuryJson.treasuries) ? treasuryJson.treasuries : []);
      setMovements(Array.isArray(movementJson.movements) ? movementJson.movements : []);
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
    for (const m of movements) if (m.category) set.add(m.category);
    return Array.from(set).sort();
  }, [movements]);

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = filterFrom ? new Date(`${filterFrom}T00:00:00`) : null;
    const to = filterTo ? new Date(`${filterTo}T23:59:59`) : null;

    return movements.filter((m) => {
      const created = new Date(m.createdAt);
      const paymentMode = getPaymentModeFromDescription(m.description);
      const studentName = getStudentName(m);
      const studentMatricule = getStudentMatricule(m);
      const studentClass = getStudentClass(m);

      if (from && !Number.isNaN(created.getTime()) && created < from) return false;
      if (to && !Number.isNaN(created.getTime()) && created > to) return false;
      if (filterTreasury && String(m.treasuryId) !== filterTreasury) return false;
      if (filterMovementType !== "TOUT" && m.movementType !== filterMovementType) return false;
      if (filterCategory && m.category !== filterCategory) return false;
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
    .filter((m) => m.movementType === "ENTREE")
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const totalDebit = filteredMovements
    .filter((m) => m.movementType === "SORTIE")
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

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

      if (m.movementType === "ENTREE") current.credit += Number(m.amount || 0);
      if (m.movementType === "SORTIE") current.debit += Number(m.amount || 0);
      current.solde = current.credit - current.debit;
      map.set(key, current);
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredMovements]);

  const realGlobalSolde = realBalanceByTreasury.reduce((sum, item) => sum + item.solde, 0);

  const balanceByMovement = useMemo(() => {
    const map = new Map<number, { before: number; after: number; debit: number; credit: number }>();
    const runningByTreasury = new Map<number, number>();

    // Solde réel: calculé sur TOUS les mouvements chargés, pas seulement sur le filtre affiché.
    // Le solde est calculé par trésorerie pour éviter de mélanger Caisse, Banque, MVola, etc.
    [...movements]
      .sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        if (da !== db) return da - db;
        return a.id - b.id;
      })
      .forEach((m) => {
        const treasuryKey = Number(m.treasuryId || 0);
        const previous = runningByTreasury.get(treasuryKey) || 0;
        const amount = Number(m.amount || 0);
        const debit = m.movementType === "SORTIE" ? amount : 0;
        const credit = m.movementType === "ENTREE" ? amount : 0;
        const before = previous;
        const after = previous - debit + credit;

        runningByTreasury.set(treasuryKey, after);
        map.set(m.id, { before, after, debit, credit });
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
      const category = formMotif || (formType === "ENTREE" ? "ENTREE_MANUELLE" : "DEPENSE");
      const res = await fetch("/api/treasury-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treasuryId,
          movementType: formType,
          category,
          amount,
          description: formDescription || getMovementLabel({ category, movementType: formType }),
          reference: formReference || `TR-${Date.now()}`,
          schoolYearName,
          createdAt: formDate,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getErrorMessage(data, "Erreur enregistrement mouvement"));

      const movementDate = formDate || todayInput();

      setShowNewModal(false);
      setFilterFrom(movementDate);
      setFilterTo(movementDate);
      setFormDate(todayInput());
      setFormTreasuryId("");
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

  async function deleteMovement(id: number) {
    if (!confirm("Supprimer ce mouvement ?")) return;
    try {
      const res = await fetch(`/api/treasury-movements?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getErrorMessage(data, "Erreur suppression mouvement"));
      await loadData();
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
      const balance = balanceByMovement.get(m.id) || { before: 0, debit: 0, credit: 0, after: 0 };
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
    <main className="min-h-screen bg-white p-3 text-[12px] text-slate-900 md:p-4">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 border-b border-slate-300 pb-2 md:flex-row md:items-center md:justify-between">
          <h1 className="text-[18px] font-normal text-slate-800">
            Historique du Trésorerie ({filteredMovements.length})
          </h1>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="h-[30px] rounded-[3px] bg-cyan-600 px-3 text-[12px] font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              ⟳ {loading ? "Chargement" : "Actualiser"}
            </button>

            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="h-[30px] rounded-[3px] border border-slate-800 bg-slate-800 px-2 text-[12px] font-semibold text-white"
            >
              <option value={SITE_NAME}>Sites : Strelitzia School</option>
            </select>

            <select
              value={schoolYearName}
              onChange={(e) => setSchoolYearName(e.target.value)}
              className="h-[30px] rounded-[3px] border border-slate-800 bg-slate-800 px-2 text-[12px] font-semibold text-white"
            >
              <option value="2025-2026">Année scolaire : 2025-2026</option>
              <option value="2026-2027">Année scolaire : 2026-2027</option>
            </select>

            <button
              type="button"
              onClick={exportCsv}
              className="h-[30px] rounded-[3px] bg-blue-600 px-3 text-[12px] font-semibold text-white hover:bg-blue-700"
            >
              Export Excel
            </button>

            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="h-[30px] rounded-[3px] border border-slate-800 bg-white px-3 text-[12px] font-semibold text-slate-800 hover:bg-slate-100"
            >
              ⊕ Nouveau Mouvement
            </button>
          </div>
        </div>

        <div className="rounded-[6px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-slate-800 px-3 py-2 text-white">
            <div className="font-bold">Résumé journalier</div>
            <div className="text-[10px] text-slate-200">Solde réel calculé selon la date filtrée</div>
          </div>

          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
            <div className="rounded-[6px] border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-emerald-700">Total Crédit du jour</div>
              <div className="mt-1 text-[18px] font-black text-emerald-700">{money(totalCredit)}</div>
            </div>
            <div className="rounded-[6px] border border-red-200 bg-red-50 p-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-red-700">Total Débit du jour</div>
              <div className="mt-1 text-[18px] font-black text-red-700">{money(totalDebit)}</div>
            </div>
            <div className="rounded-[6px] border border-slate-200 bg-slate-900 p-3 text-white shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-slate-300">Solde réel global du jour</div>
              <div className={realGlobalSolde >= 0 ? "mt-1 text-[18px] font-black text-white" : "mt-1 text-[18px] font-black text-red-200"}>
                {money(realGlobalSolde)}
              </div>
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

        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="rechercher élève, frais, matricule, classe..."
            className="h-[30px] w-full max-w-[320px] border border-slate-300 px-2 outline-none focus:border-cyan-600"
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

        <div className="hidden overflow-x-auto rounded-[4px] border border-slate-300 bg-white md:block">
          <table className="w-full min-w-[1580px] border-collapse text-[10.5px]">
            <thead>
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
                  <th key={h} className="border border-slate-600 px-2 py-[6px] font-bold whitespace-nowrap">
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
                  const balance = balanceByMovement.get(m.id) || { before: 0, debit: 0, credit: 0, after: 0 };
                  const modePaiement = getPaymentModeFromDescription(m.description);

                  return (
                    <tr key={m.id} className="hover:bg-cyan-50">
                      <td className="border px-2 py-1 align-top whitespace-nowrap">{m.schoolYearName || schoolYearName}</td>
                      <td className="border px-2 py-1 align-top whitespace-nowrap">{formatDateFR(m.createdAt)}</td>
                      <td className="border px-2 py-1 align-top">
                        <div className="max-w-[120px] truncate font-semibold text-slate-700" title={m.reference || ""}>
                          {m.reference || "-"}
                        </div>
                      </td>
                      <td className="border px-2 py-1 align-top">
                        <div className="max-w-[130px] truncate font-bold text-cyan-700" title={m.treasury?.name || ""}>
                          {m.treasury?.name || "-"}
                        </div>
                      </td>
                      <td className="border px-2 py-1 align-top text-center font-semibold text-slate-800">{matricule}</td>
                      <td className="border px-2 py-1 align-top">
                        <div className="max-w-[230px] truncate font-semibold text-slate-900" title={feeLabel}>
                          {feeLabel}
                        </div>
                        {m.description && m.description !== feeLabel && (
                          <div className="max-w-[230px] truncate text-[9px] text-slate-500" title={m.description}>
                            {m.description}
                          </div>
                        )}
                      </td>
                      <td className="border px-2 py-1 align-top">
                        <div className="max-w-[190px] truncate font-bold text-blue-700" title={studentName}>
                          {studentName}
                        </div>
                        <div className="text-[9px] text-slate-600">
                          {matricule !== "-" ? `${matricule} • ` : ""}{studentClass}
                        </div>
                      </td>
                      <td className="border px-2 py-1 align-top text-center">
                        <span
                          className={
                            m.movementType === "ENTREE"
                              ? "inline-flex rounded-full bg-emerald-100 px-2 py-[2px] text-[9px] font-bold text-emerald-700"
                              : "inline-flex rounded-full bg-red-100 px-2 py-[2px] text-[9px] font-bold text-red-700"
                          }
                        >
                          {getMovementTypeLabel(m.movementType)}
                        </span>
                      </td>
                      <td className="border px-2 py-1 align-top whitespace-nowrap">{feeCode}</td>
                      <td className="border px-2 py-1 align-top whitespace-nowrap">{modePaiement}</td>
                      <td className="border px-2 py-1 align-top text-right whitespace-nowrap">{money(balance.before)}</td>
                      <td className="border px-2 py-1 align-top text-right font-bold text-red-700 whitespace-nowrap">
                        {balance.debit ? money(balance.debit) : "-"}
                      </td>
                      <td className="border px-2 py-1 align-top text-right font-bold text-emerald-700 whitespace-nowrap">
                        {balance.credit ? money(balance.credit) : "-"}
                      </td>
                      <td className="border px-2 py-1 align-top text-right font-bold text-blue-700 whitespace-nowrap">{money(balance.after)}</td>
                      <td className="border px-2 py-1 align-top">
                        <div className="max-w-[110px] truncate" title={m.createdBy || ""}>{m.createdBy || "-"}</div>
                      </td>
                      <td className="border px-2 py-1 align-top whitespace-nowrap">{formatDateTimeFR(m.createdAt)}</td>
                      <td className="border px-2 py-1 align-top text-center">
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

        <div className="grid gap-2 md:hidden">
          {filteredMovements.map((m) => {
            const studentName = getStudentName(m);
            const matricule = getStudentMatricule(m);
            const studentClass = getStudentClass(m);
            const feeLabel = getFeeLabelFromMovement(m);
            const feeCode = getFeeCodeFromMovement(m);
            const isPaymentFee = m.category === "PAIEMENT_FRAIS" || m.category === "ANNULATION_PAIEMENT_FRAIS";
            const balance = balanceByMovement.get(m.id) || { before: 0, debit: 0, credit: 0, after: 0 };

            return (
              <div key={`mobile-${m.id}`} className="rounded-[6px] border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-slate-900">
                      {isPaymentFee ? feeLabel : getMovementLabel(m)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatDateFR(m.createdAt)} • {m.reference || `N° ${m.id}`} • {m.treasury?.name || "-"}
                    </p>
                  </div>
                  <span
                    className={
                      m.movementType === "ENTREE"
                        ? "shrink-0 rounded-full bg-emerald-100 px-2 py-[2px] text-[10px] font-bold text-emerald-700"
                        : "shrink-0 rounded-full bg-red-100 px-2 py-[2px] text-[10px] font-bold text-red-700"
                    }
                  >
                    {getMovementTypeLabel(m.movementType)}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Élève</span>
                    <p className="font-semibold text-blue-700">{studentName}</p>
                    <p className="text-[10px] text-slate-500">{matricule} • {studentClass}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">Montant</span>
                    <p className={m.movementType === "ENTREE" ? "font-black text-emerald-700" : "font-black text-red-700"}>
                      {money(m.amount)}
                    </p>
                    <p className="text-[10px] text-slate-500">Solde après: {money(balance.after)}</p>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-3 pt-[90px]">
          <div className="w-full max-w-[640px] overflow-hidden rounded-[3px] bg-white shadow-2xl">
            <div className="flex h-[50px] items-center justify-between bg-slate-800 px-4 text-white">
              <h2 className="text-[16px] font-bold">Nouveau Mouvement</h2>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-slate-300 hover:text-white">×</button>
            </div>

            <form onSubmit={saveMovement} className="p-4">
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span>Date</span>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="h-[26px] w-full border px-2" />
                </label>
                <label className="space-y-1">
                  <span>Type du Mouvement</span>
                  <select value={formType} onChange={(e) => setFormType(e.target.value as any)} className="h-[26px] w-full border px-2">
                    <option value="">Choisissez le type du mouvement</option>
                    <option value="ENTREE">CREDIT</option>
                    <option value="SORTIE">DEBIT</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span>Trésorerie</span>
                  <select value={formTreasuryId} onChange={(e) => setFormTreasuryId(e.target.value)} className="h-[26px] w-full border px-2">
                    <option value="">Choisissez une trésorerie</option>
                    {treasuries.filter((t) => t.active !== false).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
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
              <div className="mt-4 border-t pt-3 text-right">
                <button type="button" onClick={() => setShowNewModal(false)} className="mr-2 rounded-[3px] bg-slate-600 px-4 py-2 text-white">Fermer</button>
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
                    <option value="ENTREE">CREDIT</option>
                    <option value="SORTIE">DEBIT</option>
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
              <div className="mt-4 border-t pt-3 text-right">
                <button type="button" onClick={() => setShowFilterModal(false)} className="mr-2 rounded-[3px] bg-slate-600 px-4 py-2 text-white">Fermer</button>
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
