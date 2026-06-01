
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Treasury = {
  id: number;
  name: string;
  type: string;
  active: boolean;
  totalEntree?: number;
  totalSortie?: number;
  solde?: number;
  site?: string | null;
  schoolYearName?: string | null;
  isDefault?: boolean | null;
  default?: boolean | null;
  principale?: boolean | null;
  isPrincipal?: boolean | null;
  accountName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  address?: string | null;
  bic?: string | null;
};

type Dashboard = {
  treasuries?: Treasury[];
  totals?: {
    totalEntree: number;
    totalSortie: number;
    soldeGlobal: number;
  };
};

type SchoolYear = {
  id?: number;
  name?: string;
  label?: string;
  active?: boolean;
};

type TreasuryMovement = {
  id?: number | string;
  treasuryId?: number | string | null;
  treasury?: { id?: number | string | null } | null;
  type?: string | null;
  sens?: string | null;
  operation?: string | null;
  movementType?: string | null;
  debit?: number | string | null;
  credit?: number | string | null;
  amount?: number | string | null;
  montant?: number | string | null;
  schoolYearName?: string | null;
  year?: string | null;
  anneeScolaire?: string | null;
};

type TreasuryBalance = {
  totalEntree: number;
  totalSortie: number;
  solde: number;
};

function toNumber(value: unknown) {
  const cleaned = String(value ?? "0").replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeMovementRows(data: any): TreasuryMovement[] {
  const raw = Array.isArray(data)
    ? data
    : data?.movements || data?.treasuryMovements || data?.data || data?.items || [];

  return Array.isArray(raw) ? raw : [];
}

function getMovementTreasuryId(movement: TreasuryMovement) {
  return String(movement.treasuryId ?? movement.treasury?.id ?? "").trim();
}

function getMovementType(movement: TreasuryMovement) {
  const raw = String(
    movement.type ||
      movement.sens ||
      movement.operation ||
      movement.movementType ||
      ""
  ).toUpperCase();

  if (raw === "DEBIT" || raw === "SORTIE" || raw === "DEPENSE" || raw === "DÉPENSE") {
    return "DEBIT";
  }

  if (raw === "CREDIT" || raw === "CRÉDIT" || raw === "ENTREE" || raw === "ENTRÉE" || raw === "RECETTE") {
    return "CREDIT";
  }

  const debit = toNumber(movement.debit);
  const credit = toNumber(movement.credit);
  if (debit > 0 && credit <= 0) return "DEBIT";
  return "CREDIT";
}

function getMovementAmount(movement: TreasuryMovement) {
  const debit = toNumber(movement.debit);
  const credit = toNumber(movement.credit);

  if (debit > 0) return debit;
  if (credit > 0) return credit;

  return Math.abs(toNumber(movement.amount ?? movement.montant));
}

function buildRealBalancesByTreasury(movements: TreasuryMovement[]) {
  const map = new Map<string, TreasuryBalance>();

  for (const movement of movements) {
    const treasuryId = getMovementTreasuryId(movement);
    if (!treasuryId) continue;

    const current = map.get(treasuryId) || {
      totalEntree: 0,
      totalSortie: 0,
      solde: 0,
    };

    const amount = getMovementAmount(movement);
    if (amount <= 0) continue;

    if (getMovementType(movement) === "DEBIT") {
      current.totalSortie += amount;
    } else {
      current.totalEntree += amount;
    }

    current.solde = current.totalEntree - current.totalSortie;
    map.set(treasuryId, current);
  }

  return map;
}

function applyRealBalancesToTreasuries(treasuries: Treasury[], movements: TreasuryMovement[]) {
  const balances = buildRealBalancesByTreasury(movements);

  return treasuries.map((treasury) => {
    const balance = balances.get(String(treasury.id)) || {
      totalEntree: 0,
      totalSortie: 0,
      solde: 0,
    };

    return {
      ...treasury,
      totalEntree: balance.totalEntree,
      totalSortie: balance.totalSortie,
      solde: balance.solde,
    };
  });
}

function getRealTotals(treasuries: Treasury[]) {
  return treasuries.reduce(
    (acc, treasury) => {
      acc.totalEntree += Number(treasury.totalEntree || 0);
      acc.totalSortie += Number(treasury.totalSortie || 0);
      acc.soldeGlobal += Number(treasury.solde || 0);
      return acc;
    },
    { totalEntree: 0, totalSortie: 0, soldeGlobal: 0 }
  );
}

const TYPE_OPTIONS = [
  { value: "CAISSE", label: "Caisse" },
  { value: "BANQUE", label: "Banque" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "AUTRE", label: "Autre" },
];

const DEFAULT_YEAR = "2025-2026";

function formatMoney(value: number | undefined | null) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0));
}

function normalizeType(type: string | undefined | null) {
  const value = String(type || "CAISSE").toUpperCase();
  if (value === "MOBILE_MONEY") return "Mobile Money";
  if (value === "CAISSE") return "Caisse";
  if (value === "BANQUE") return "Banque";
  return "Autre";
}

function isPrincipalTreasury(item: Treasury) {
  return Boolean(item.isDefault || item.default || item.principale || item.isPrincipal);
}

function getYearName(item: SchoolYear) {
  return item.name || item.label || "";
}


function getTreasuryYear(item: Partial<Treasury>) {
  return cleanYear(
    item.schoolYearName ||
      (item as any).schoolYear?.name ||
      (item as any).schoolYear?.label ||
      (item as any).anneeScolaire ||
      (item as any).year
  );
}

function cleanYear(value: unknown) {
  return String(value ?? "").trim();
}

function sameSchoolYear(item: Partial<Treasury>, year: string) {
  return getTreasuryYear(item) === cleanYear(year);
}

function normalizeTreasuries(data: any): Treasury[] {
  const raw = Array.isArray(data) ? data : data?.treasuries || data?.data || data?.items || [];
  return (Array.isArray(raw) ? raw : []).map((item: any) => ({
    ...item,
    schoolYearName: getTreasuryYear(item),
  }));
}

function normalizeSchoolYears(data: any): SchoolYear[] {
  const raw = Array.isArray(data)
    ? data
    : data?.schoolYears || data?.years || data?.data || data?.items || [];

  return (Array.isArray(raw) ? raw : [])
    .map((item: any) => ({
      id: item.id,
      name: item.name || item.label || item.schoolYearName || item.anneeScolaire || item.year || "",
      label: item.label,
      active: Boolean(item.active || item.isActive || item.actif),
    }))
    .filter((item: SchoolYear) => getYearName(item));
}

export default function TreasuriesPage() {
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [schoolYearName, setSchoolYearName] = useState(DEFAULT_YEAR);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [site, setSite] = useState("Strelitzia School");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("CAISSE");
  const [isDefault, setIsDefault] = useState(false);

  const [actionMenu, setActionMenu] = useState<{ id: number; top: number; left: number } | null>(null);
  const loadSeqRef = useRef(0);
  const initializedYearRef = useRef(false);

  const sourceRows = useMemo(() => {
    // IMPORTANT: on ne filtre plus une 2e fois côté frontend.
    // L'API reçoit déjà schoolYearName et doit renvoyer uniquement les données de l'année choisie.
    // Si les anciennes lignes n'ont pas encore schoolYearName, ce double filtre les cachait toutes.
    return dashboard?.treasuries ?? treasuries;
  }, [dashboard, treasuries]);

  const principalId = useMemo(() => {
    const found = sourceRows.find(isPrincipalTreasury);
    return found?.id || null;
  }, [sourceRows]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sourceRows;
    return sourceRows.filter((item) =>
      [
        item.name,
        item.site,
        item.schoolYearName,
        item.type,
        item.accountName,
        item.accountNumber,
        item.bankName,
        item.address,
        item.bic,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [sourceRows, search]);

  const loadSchoolYears = useCallback(async () => {
    try {
      const res = await fetch("/api/school-years", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      const list = normalizeSchoolYears(data);
      setSchoolYears(list);

      // L'année active créée dans Paramètres devient la sélection principale seulement au premier affichage.
      if (!initializedYearRef.current) {
        initializedYearRef.current = true;
        const active = list.find((y) => y.active) || list[0];
        const activeName = active ? getYearName(active) : "";
        if (activeName) setSchoolYearName(activeName);
      }
    } catch {
      initializedYearRef.current = true;
      // Si l'API année scolaire n'existe pas encore, on garde DEFAULT_YEAR.
    }
  }, []);

  const loadData = useCallback(async (year: string) => {
    const selectedYear = cleanYear(year) || DEFAULT_YEAR;
    const seq = ++loadSeqRef.current;

    // Nettoyage immédiat: aucune donnée de l'ancienne année ne reste affichée.
    setLoading(true);
    setActionMenu(null);
    setTreasuries([]);
    setDashboard({ treasuries: [], totals: { totalEntree: 0, totalSortie: 0, soldeGlobal: 0 } });

    try {
      const qs = `?schoolYearName=${encodeURIComponent(selectedYear)}`;
      const [treasuryRes, dashboardRes, movementRes] = await Promise.all([
        fetch(`/api/treasuries${qs}`, { cache: "no-store" }),
        fetch(`/api/treasury-dashboard${qs}`, { cache: "no-store" }),
        fetch(`/api/treasury-movements${qs}`, { cache: "no-store" }),
      ]);

      const treasuryJson = await treasuryRes.json().catch(() => ({}));
      const dashboardJson = await dashboardRes.json().catch(() => ({}));
      const movementJson = await movementRes.json().catch(() => ({}));

      // Si l'utilisateur a changé d'année pendant le chargement, on ignore cette ancienne réponse.
      if (seq !== loadSeqRef.current) return;

      if (!treasuryRes.ok) throw new Error(treasuryJson.error || "Erreur chargement trésoreries");
      if (!dashboardRes.ok) throw new Error(dashboardJson.error || "Erreur chargement dashboard");
      if (!movementRes.ok) throw new Error(movementJson.error || "Erreur chargement mouvements");

      const movementRows = normalizeMovementRows(movementJson);
      const loadedTreasuries = applyRealBalancesToTreasuries(
        normalizeTreasuries(treasuryJson),
        movementRows
      );

      const dashboardSourceTreasuries = normalizeTreasuries(dashboardJson);
      const loadedDashboardTreasuries = applyRealBalancesToTreasuries(
        dashboardSourceTreasuries.length > 0 ? dashboardSourceTreasuries : loadedTreasuries,
        movementRows
      );
      const realTotals = getRealTotals(loadedDashboardTreasuries);

      setTreasuries(loadedTreasuries);
      setDashboard({
        ...dashboardJson,
        treasuries: loadedDashboardTreasuries,
        totals: realTotals,
      });
    } catch (error: any) {
      if (seq === loadSeqRef.current) alert(error?.message || "Erreur serveur");
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchoolYears();
  }, [loadSchoolYears]);

  useEffect(() => {
    setSearch("");
    loadData(schoolYearName);
  }, [schoolYearName, loadData]);

  function openCreate() {
    setActionMenu(null);
    setEditId(null);
    setName("");
    setType("CAISSE");
    setIsDefault(false);
    setModalOpen(true);
  }

  function openEdit(item: Treasury) {
    setActionMenu(null);
    setEditId(item.id);
    setName(item.name || "");
    setType(String(item.type || "CAISSE").toUpperCase());
    setIsDefault(isPrincipalTreasury(item));
    setModalOpen(true);
  }

  function toggleActionMenu(e: React.MouseEvent<HTMLButtonElement>, id: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    setActionMenu((current) =>
      current?.id === id
        ? null
        : {
            id,
            top: rect.bottom + 6,
            left: Math.max(12, rect.right - 190),
          }
    );
  }

  async function saveTreasury(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (!name.trim()) {
      alert("Nom trésorerie obligatoire");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/treasuries", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          name: name.trim(),
          type,
          active: true,
          site,
          schoolYearName: cleanYear(schoolYearName),
          isDefault: isDefault || (!editId && sourceRows.length === 0),
          principale: isDefault || (!editId && sourceRows.length === 0),
          isPrincipal: isDefault || (!editId && sourceRows.length === 0),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Erreur enregistrement");
        return;
      }

      setModalOpen(false);
      await loadData(schoolYearName);
    } finally {
      setSaving(false);
    }
  }

  async function setAsPrincipal(item: Treasury) {
    setActionMenu(null);
    const ok = confirm(`Définir "${item.name}" comme trésorerie principale pour ${schoolYearName} ?`);
    if (!ok) return;

    const res = await fetch("/api/treasuries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...item,
        id: item.id,
        name: item.name,
        type: item.type,
        active: item.active ?? true,
        site: item.site || site,
        schoolYearName: cleanYear(schoolYearName),
        isDefault: true,
        principale: true,
        isPrincipal: true,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Erreur modification principale");
      return;
    }
    await loadData(schoolYearName);
  }

  async function deleteTreasury(id: number) {
    setActionMenu(null);
    const ok = confirm("Supprimer cette trésorerie ? Si elle contient déjà des mouvements, elle sera désactivée.");
    if (!ok) return;

    const res = await fetch(`/api/treasuries?id=${id}&schoolYearName=${encodeURIComponent(schoolYearName)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Erreur suppression");
      return;
    }
    await loadData(schoolYearName);
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[12px] text-slate-900" onClick={() => actionMenu && setActionMenu(null)}>
      <div className="px-3 py-3 md:px-4">
        <div className="flex flex-col gap-2 border-b border-slate-300 pb-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">
              Listes des Trésoreries ({rows.length})
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Année scolaire : <span className="font-bold text-blue-700">{schoolYearName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => loadData(schoolYearName)}
              disabled={loading}
              className="h-8 rounded-[3px] bg-[#0b9aad] px-3 text-[12px] font-bold text-white shadow-sm hover:bg-[#087f8f] disabled:opacity-50"
            >
              {loading ? "Chargement..." : "↻ Actualiser"}
            </button>

            <select
              value={schoolYearName}
              onChange={(e) => setSchoolYearName(cleanYear(e.target.value))}
              className="h-8 min-w-[145px] rounded-[3px] border border-blue-700 bg-blue-700 px-2 text-[12px] font-bold text-white outline-none"
            >
              {schoolYears.length === 0 ? (
                <option value={DEFAULT_YEAR}>{DEFAULT_YEAR}</option>
              ) : (
                schoolYears.map((year) => {
                  const value = getYearName(year);
                  return (
                    <option key={value} value={value}>
                      {value}{year.active ? " • active" : ""}
                    </option>
                  );
                })
              )}
            </select>

            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="h-8 rounded-[3px] border border-slate-700 bg-[#252b33] px-2 text-[12px] font-bold text-white outline-none"
            >
              <option value="Strelitzia School">Sites : Strelitzia School</option>
            </select>

            <button
              onClick={openCreate}
              className="h-8 rounded-[3px] border border-slate-900 bg-white px-3 text-[12px] font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
            >
              ⊕ Ajout
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="rounded-[4px] border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-900">
            La trésorerie principale est marquée par une case bleue cochée. Une seule doit être principale par année scolaire.
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche..."
            className="h-8 w-full border border-slate-300 bg-white px-2 outline-none focus:border-blue-500 md:max-w-[220px]"
          />
        </div>

        <section className="mt-2 overflow-x-auto overflow-y-visible border border-slate-300 bg-white shadow-sm">
          <table className="w-full min-w-[1220px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#2d333c] text-left text-white">
                <th className="w-[70px] border-r border-slate-500 px-2 py-2 text-center font-bold">Principale</th>
                <th className="w-[230px] border-r border-slate-500 px-2 py-2 font-bold">Nom <span className="float-right text-slate-300">↕</span></th>
                <th className="w-[130px] border-r border-slate-500 px-2 py-2 font-bold">Année scolaire <span className="float-right text-slate-300">↕</span></th>
                <th className="w-[130px] border-r border-slate-500 px-2 py-2 font-bold">Site <span className="float-right text-slate-300">↕</span></th>
                <th className="w-[95px] border-r border-slate-500 px-2 py-2 font-bold">TYPE <span className="float-right text-slate-300">↕</span></th>
                <th className="w-[145px] border-r border-slate-500 px-2 py-2 font-bold">Nom du compte <span className="float-right text-slate-300">↕</span></th>
                <th className="w-[155px] border-r border-slate-500 px-2 py-2 font-bold">numero du compte <span className="float-right text-slate-300">↕</span></th>
                <th className="w-[190px] border-r border-slate-500 px-2 py-2 font-bold">banque Correspondante <span className="float-right text-slate-300">↕</span></th>
                <th className="w-[95px] border-r border-slate-500 px-2 py-2 font-bold">solde <span className="float-right text-slate-300">↕</span></th>
                <th className="w-[80px] border-r border-slate-500 px-2 py-2 font-bold">Adresse <span className="float-right text-slate-300">↕</span></th>
                <th className="w-[45px] border-r border-slate-500 px-2 py-2 font-bold">bic <span className="float-right text-slate-300">↕</span></th>
                <th className="w-[95px] px-2 py-2 text-center font-bold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item) => {
                const checked = item.id === principalId || isPrincipalTreasury(item);
                return (
                  <tr key={item.id} className="border-b border-slate-300 hover:bg-[#c1eee4]">
                    <td className="border-r border-slate-300 px-2 py-[6px] text-center">
                      <button
                        type="button"
                        onClick={() => setAsPrincipal(item)}
                        title={checked ? "Trésorerie principale" : "Définir comme principale"}
                        className={
                          checked
                            ? "inline-flex h-6 w-6 items-center justify-center rounded-[5px] border border-blue-700 bg-blue-600 text-white shadow-sm"
                            : "inline-flex h-6 w-6 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-transparent hover:border-blue-500 hover:bg-blue-50"
                        }
                      >
                        ✓
                      </button>
                    </td>
                    <td className="border-r border-slate-300 px-2 py-[6px] font-semibold text-slate-900">
                      {item.name}
                      {checked && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Principale</span>}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-[6px] font-semibold text-blue-700">{item.schoolYearName || schoolYearName}</td>
                    <td className="border-r border-slate-300 px-2 py-[6px]">{item.site || site}</td>
                    <td className="border-r border-slate-300 px-2 py-[6px]">{normalizeType(item.type)}</td>
                    <td className="border-r border-slate-300 px-2 py-[6px]">{item.accountName || ""}</td>
                    <td className="border-r border-slate-300 px-2 py-[6px]">{item.accountNumber || ""}</td>
                    <td className="border-r border-slate-300 px-2 py-[6px]">{item.bankName || ""}</td>
                    <td
                      className={`border-r border-slate-300 px-2 py-[6px] text-right font-black ${
                        Number(item.solde || 0) < 0 ? "text-red-700" : "text-emerald-700"
                      }`}
                      title={`Solde réel = total CREDIT (${formatMoney(item.totalEntree)}) - total DEBIT (${formatMoney(item.totalSortie)})`}
                    >
                      {formatMoney(item.solde)} Ar
                    </td>
                    <td className="border-r border-slate-300 px-2 py-[6px]">{item.address || ""}</td>
                    <td className="border-r border-slate-300 px-2 py-[6px]">{item.bic || ""}</td>
                    <td className="px-2 py-[4px] text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActionMenu(e, item.id);
                        }}
                        className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-800 shadow-sm hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Actions <span className="text-[10px]">▾</span>
                      </button>

                      {actionMenu?.id === item.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="fixed z-[9999] w-[190px] overflow-hidden rounded-[6px] border border-slate-200 bg-white text-left shadow-2xl"
                          style={{ top: actionMenu.top, left: actionMenu.left }}
                        >
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-white">✎</span>
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => setAsPrincipal(item)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white">✓</span>
                            Mettre principale
                          </button>
                          <a
                            href={`/user/treasury-movements?schoolYearName=${encodeURIComponent(schoolYearName)}&treasuryId=${item.id}`}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white">↗</span>
                            Mouvements
                          </a>
                          <button
                            type="button"
                            onClick={() => deleteTreasury(item.id)}
                            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-[12px] font-semibold text-red-700 hover:bg-red-50"
                          >
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-red-600 text-white">×</span>
                            Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                    Aucune trésorerie trouvée pour l'année scolaire « {schoolYearName} ».
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-3 pt-[110px]">
          <form onSubmit={saveTreasury} className="w-full max-w-[430px] overflow-hidden rounded-[6px] bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#303640] px-3 py-3 text-white">
              <h2 className="text-[16px] font-black">{editId ? "Modifier Trésorerie" : "Nouveau Trésorerie"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[22px] leading-none text-slate-300 hover:text-white">
                ×
              </button>
            </div>

            <div className="space-y-3 px-3 py-4">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-700">Année scolaire</span>
                <select
                  value={schoolYearName}
                  onChange={(e) => setSchoolYearName(cleanYear(e.target.value))}
                  className="h-8 w-full border border-blue-300 bg-blue-50 px-2 text-[12px] font-bold text-blue-800 outline-none focus:border-blue-600"
                >
                  {schoolYears.length === 0 ? (
                    <option value={DEFAULT_YEAR}>{DEFAULT_YEAR}</option>
                  ) : (
                    schoolYears.map((year) => {
                      const value = getYearName(year);
                      return (
                        <option key={value} value={value}>
                          {value}{year.active ? " • active" : ""}
                        </option>
                      );
                    })
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-700">Nom trésorerie</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom du trésorerie"
                  className="h-8 w-full border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
                />
              </label>

              <button
                type="button"
                onClick={() => setIsDefault((v) => !v)}
                className={
                  isDefault
                    ? "flex w-full items-center gap-2 rounded-[5px] border border-blue-600 bg-blue-50 px-3 py-2 text-left text-[12px] font-bold text-blue-800"
                    : "flex w-full items-center gap-2 rounded-[5px] border border-slate-300 bg-slate-50 px-3 py-2 text-left text-[12px] font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                }
              >
                <span
                  className={
                    isDefault
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-[4px] bg-blue-600 text-white"
                      : "inline-flex h-5 w-5 items-center justify-center rounded-[4px] border border-slate-400 bg-white text-transparent"
                  }
                >
                  ✓
                </span>
                Cocher si cette trésorerie est principale / par défaut
              </button>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-700">Sites</span>
                <select
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className="h-8 w-full border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-500"
                >
                  <option value="Strelitzia School">Strelitzia School</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-700">Type trésorerie</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-8 w-full border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-500"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t bg-white px-3 py-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-[3px] bg-slate-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-slate-700"
              >
                Fermer
              </button>
              <button
                disabled={saving}
                className="rounded-[3px] bg-blue-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
