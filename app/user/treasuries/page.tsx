"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_YEAR = "2025-2026";

type Treasury = {
  id: number;
  name: string;
  type: string;
  active: boolean;
  siteId?: number | null;
  site?: string | null;
  schoolYearName?: string | null;
  isDefault?: boolean | null;
  default?: boolean | null;
  principale?: boolean | null;
  isPrincipal?: boolean | null;
  totalEntree?: number;
  totalSortie?: number;
  totalCredit?: number;
  totalDebit?: number;
  solde?: number;
  balance?: number;
  soldeReel?: number;
  accountName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  address?: string | null;
  bic?: string | null;
};

type SchoolYear = {
  id?: number;
  name?: string;
  label?: string;
  active?: boolean;
};

type Site = {
  id: number;
  name: string;
  code?: string;
  active?: boolean;
};

type TreasuryMovement = {
  id?: number | string;
  treasuryId?: number | string | null;
  movementType?: string | null;
  type?: string | null;
  sens?: string | null;
  operation?: string | null;
  amount?: number | string | null;
  montant?: number | string | null;
  credit?: number | string | null;
  debit?: number | string | null;
};

type Dashboard = {
  treasuries?: Treasury[];
  totals?: {
    totalEntree?: number;
    totalSortie?: number;
    totalCredit?: number;
    totalDebit?: number;
    soldeGlobal?: number;
    solde?: number;
    balance?: number;
  };
};

const TYPE_OPTIONS = [
  { value: "CAISSE", label: "Caisse" },
  { value: "BANQUE", label: "Banque" },
];

function text(value: unknown) {
  return String(value ?? "").trim();
}

function cleanYear(value: unknown) {
  return text(value) || DEFAULT_YEAR;
}

function getYearName(year: SchoolYear) {
  return text(year.name || year.label);
}

function normalizeType(value: unknown) {
  const raw = text(value).toUpperCase();
  return raw === "BANQUE" ? "BANQUE" : "CAISSE";
}

function toNumber(value: unknown) {
  const cleaned = String(value ?? "0").replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: unknown) {
  const n = toNumber(value);
  return new Intl.NumberFormat("fr-FR").format(n);
}

function isPrincipalTreasury(item: Treasury) {
  return Boolean(item.isPrincipal || item.isDefault || item.default || item.principale);
}

function normalizeMovementType(movement: TreasuryMovement) {
  const raw = text(
    movement.movementType ||
      movement.type ||
      movement.sens ||
      movement.operation
  ).toUpperCase();

  if (raw === "DEBIT" || raw === "SORTIE" || raw === "DEPENSE" || raw === "DÉPENSE") {
    return "DEBIT";
  }

  if (raw === "CREDIT" || raw === "ENTREE" || raw === "ENTRÉE" || raw === "RECETTE") {
    return "CREDIT";
  }

  if (toNumber(movement.debit) > 0) return "DEBIT";
  if (toNumber(movement.credit) > 0) return "CREDIT";

  return "CREDIT";
}

function getMovementAmount(movement: TreasuryMovement) {
  const type = normalizeMovementType(movement);

  if (type === "DEBIT") {
    return toNumber(movement.debit) || toNumber(movement.amount) || toNumber(movement.montant);
  }

  return toNumber(movement.credit) || toNumber(movement.amount) || toNumber(movement.montant);
}

function normalizeSchoolYears(data: any): SchoolYear[] {
  const raw = Array.isArray(data)
    ? data
    : data?.schoolYears || data?.years || data?.data || data?.items || [];

  return (Array.isArray(raw) ? raw : [])
    .map((item: any) => ({
      id: item.id,
      name: item.name || item.label,
      label: item.label || item.name,
      active: Boolean(item.active || item.isActive || item.actif),
    }))
    .filter((item: SchoolYear) => getYearName(item));
}

function normalizeSites(data: any): Site[] {
  const raw = Array.isArray(data) ? data : data?.sites || data?.data || data?.items || [];

  return (Array.isArray(raw) ? raw : [])
    .map((item: any) => ({
      id: Number(item.id),
      name: text(item.name || item.label || item.site),
      code: text(item.code),
      active: Boolean(item.active || item.isActive || item.actif),
    }))
    .filter((item: Site) => item.id && item.name);
}

function normalizeTreasuries(data: any): Treasury[] {
  const raw = Array.isArray(data) ? data : data?.treasuries || data?.data || data?.items || [];

  return (Array.isArray(raw) ? raw : []).map((item: any) => ({
    ...item,
    id: Number(item.id),
    name: text(item.name),
    type: normalizeType(item.type),
    active: item.active !== false,
    siteId: item.siteId ?? null,
    site: item.site ?? null,
    schoolYearName: item.schoolYearName || item.anneeScolaire || item.year || DEFAULT_YEAR,
    totalEntree: Number(item.totalEntree ?? item.totalCredit ?? 0),
    totalSortie: Number(item.totalSortie ?? item.totalDebit ?? 0),
    solde: Number(item.solde ?? item.balance ?? item.soldeReel ?? 0),
  }));
}

function normalizeMovementRows(data: any): TreasuryMovement[] {
  const raw = Array.isArray(data)
    ? data
    : data?.movements || data?.treasuryMovements || data?.data || data?.items || [];

  return Array.isArray(raw) ? raw : [];
}

function applyRealBalancesToTreasuries(treasuries: Treasury[], movements: TreasuryMovement[]) {
  return treasuries.map((treasury) => {
    let totalEntree = 0;
    let totalSortie = 0;

    for (const movement of movements) {
      if (Number(movement.treasuryId) !== Number(treasury.id)) continue;

      const amount = getMovementAmount(movement);
      const type = normalizeMovementType(movement);

      if (type === "DEBIT") totalSortie += amount;
      else totalEntree += amount;
    }

    const solde = totalEntree - totalSortie;

    return {
      ...treasury,
      totalEntree,
      totalSortie,
      totalCredit: totalEntree,
      totalDebit: totalSortie,
      solde,
      balance: solde,
      soldeReel: solde,
    };
  });
}

function getRealTotals(treasuries: Treasury[]) {
  const totalEntree = treasuries.reduce((sum, item) => sum + toNumber(item.totalEntree), 0);
  const totalSortie = treasuries.reduce((sum, item) => sum + toNumber(item.totalSortie), 0);
  const soldeGlobal = totalEntree - totalSortie;

  return {
    totalEntree,
    totalSortie,
    soldeGlobal,
    totalCredit: totalEntree,
    totalDebit: totalSortie,
    solde: soldeGlobal,
    balance: soldeGlobal,
  };
}

export default function TreasuriesPage() {
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [schoolYearName, setSchoolYearName] = useState(DEFAULT_YEAR);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("CAISSE");
  const [isDefault, setIsDefault] = useState(false);

  const [actionMenu, setActionMenu] = useState<{ id: number; top: number; left: number } | null>(null);

  const loadSeqRef = useRef(0);
  const initializedYearRef = useRef(false);
  const initializedSiteRef = useRef(false);

  const selectedSite = useMemo(() => {
    return sites.find((item) => String(item.id) === String(selectedSiteId)) || null;
  }, [sites, selectedSiteId]);

  const selectedSiteName = selectedSite?.name || "Strelitzia School";

  const sourceRows = useMemo(() => {
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

      if (!initializedYearRef.current) {
        initializedYearRef.current = true;

        const active = list.find((year) => year.active) || list[0];
        const activeName = active ? getYearName(active) : "";

        if (activeName) setSchoolYearName(activeName);
      }
    } catch {
      initializedYearRef.current = true;
    }
  }, []);

  const loadSites = useCallback(async () => {
    try {
      const res = await fetch(`/api/sites?_ts=${Date.now()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) return;

      const list = normalizeSites(data);
      setSites(list);

      if (!initializedSiteRef.current) {
        initializedSiteRef.current = true;

        const active = list.find((site) => site.active) || list[0];

        if (active) setSelectedSiteId(String(active.id));
      }
    } catch {
      initializedSiteRef.current = true;
    }
  }, []);

  const loadData = useCallback(async (year: string, siteId: string) => {
    const selectedYear = cleanYear(year);
    const seq = ++loadSeqRef.current;

    setLoading(true);
    setActionMenu(null);
    setTreasuries([]);
    setDashboard({
      treasuries: [],
      totals: {
        totalEntree: 0,
        totalSortie: 0,
        soldeGlobal: 0,
      },
    });

    try {
      const params = new URLSearchParams();
      params.set("schoolYearName", selectedYear);
      params.set("year", selectedYear);

      if (siteId) params.set("siteId", siteId);

      const qs = `?${params.toString()}`;

      const [treasuryRes, dashboardRes, movementRes] = await Promise.all([
        fetch(`/api/treasuries${qs}`, { cache: "no-store" }),
        fetch(`/api/treasury-dashboard${qs}`, { cache: "no-store" }).catch(() => null),
        fetch(`/api/treasury-movements${qs}`, { cache: "no-store" }),
      ]);

      const treasuryJson = await treasuryRes.json().catch(() => ({}));
      const dashboardJson = dashboardRes ? await dashboardRes.json().catch(() => ({})) : {};
      const movementJson = await movementRes.json().catch(() => ({}));

      if (seq !== loadSeqRef.current) return;

      if (!treasuryRes.ok) throw new Error(treasuryJson.error || "Erreur chargement trésoreries");
      if (dashboardRes && !dashboardRes.ok) throw new Error(dashboardJson.error || "Erreur chargement dashboard");
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
    loadSites();
  }, [loadSchoolYears, loadSites]);

  useEffect(() => {
    if (!selectedSiteId) return;

    setSearch("");
    loadData(schoolYearName, selectedSiteId);
  }, [schoolYearName, selectedSiteId, loadData]);

  function changeSite(siteId: string) {
    setSelectedSiteId(siteId);
    setActionMenu(null);
  }

  function openCreate() {
    setActionMenu(null);
    setEditId(null);
    setName("");
    setType("CAISSE");
    setIsDefault(false);

    if (!selectedSiteId && sites.length > 0) {
      const active = sites.find((item) => item.active) || sites[0];
      setSelectedSiteId(String(active.id));
    }

    setModalOpen(true);
  }

  function openEdit(item: Treasury) {
    setActionMenu(null);
    setEditId(item.id);
    setName(item.name || "");
    setType(normalizeType(item.type));
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

    if (!selectedSiteId) {
      alert("Site obligatoire");
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
          siteId: selectedSiteId,
          site: selectedSiteName,
          siteName: selectedSiteName,
          siteCode: selectedSite?.code || "",
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
      await loadData(schoolYearName, selectedSiteId);
    } finally {
      setSaving(false);
    }
  }

  async function setAsPrincipal(item: Treasury) {
    setActionMenu(null);

    const ok = confirm(
      `Définir "${item.name}" comme trésorerie principale pour ${schoolYearName} sur ${selectedSiteName} ?`
    );

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
        siteId: selectedSiteId,
        site: item.site || selectedSiteName,
        siteName: item.site || selectedSiteName,
        siteCode: selectedSite?.code || "",
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

    await loadData(schoolYearName, selectedSiteId);
  }

  async function deleteTreasury(id: number) {
    setActionMenu(null);

    const ok = confirm("Supprimer cette trésorerie ? Si elle contient déjà des mouvements, elle sera désactivée.");

    if (!ok) return;

    const params = new URLSearchParams();
    params.set("id", String(id));
    params.set("schoolYearName", schoolYearName);
    if (selectedSiteId) params.set("siteId", selectedSiteId);

    const res = await fetch(`/api/treasuries?${params.toString()}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur suppression");
      return;
    }

    await loadData(schoolYearName, selectedSiteId);
  }

  return (
    <main
      className="min-h-screen bg-[#f4f6f8] text-[12px] text-slate-900"
      onClick={() => actionMenu && setActionMenu(null)}
    >
      <div className="px-3 py-3 md:px-4">
        <div className="flex flex-col gap-2 border-b border-slate-300 pb-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">
              Listes des Trésoreries ({rows.length})
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Année scolaire : <span className="font-bold text-blue-700">{schoolYearName}</span>
              <span className="mx-2">•</span>
              Site : <span className="font-bold text-blue-700">{selectedSiteName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => loadData(schoolYearName, selectedSiteId)}
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
                      {value}
                      {year.active ? " • active" : ""}
                    </option>
                  );
                })
              )}
            </select>

            <select
              value={selectedSiteId}
              onChange={(e) => changeSite(e.target.value)}
              className="h-8 rounded-[3px] border border-slate-700 bg-[#252b33] px-2 text-[12px] font-bold text-white outline-none"
            >
              {sites.length === 0 ? (
                <option value="">Sites : Strelitzia School</option>
              ) : (
                sites.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    Sites : {item.name}
                    {item.active ? " • actif" : ""}
                  </option>
                ))
              )}
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
            La trésorerie principale est marquée par une case bleue cochée. Une seule doit être principale par site et par année scolaire.
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
                <th className="w-[230px] border-r border-slate-500 px-2 py-2 font-bold">Nom</th>
                <th className="w-[130px] border-r border-slate-500 px-2 py-2 font-bold">Année scolaire</th>
                <th className="w-[130px] border-r border-slate-500 px-2 py-2 font-bold">Site</th>
                <th className="w-[95px] border-r border-slate-500 px-2 py-2 font-bold">TYPE</th>
                <th className="w-[145px] border-r border-slate-500 px-2 py-2 font-bold">Nom du compte</th>
                <th className="w-[155px] border-r border-slate-500 px-2 py-2 font-bold">numero du compte</th>
                <th className="w-[190px] border-r border-slate-500 px-2 py-2 font-bold">banque Correspondante</th>
                <th className="w-[95px] border-r border-slate-500 px-2 py-2 font-bold">solde</th>
                <th className="w-[80px] border-r border-slate-500 px-2 py-2 font-bold">Adresse</th>
                <th className="w-[45px] border-r border-slate-500 px-2 py-2 font-bold">bic</th>
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
                      {checked && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          Principale
                        </span>
                      )}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-[6px] font-semibold text-blue-700">
                      {item.schoolYearName || schoolYearName}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-[6px]">
                      {item.site || selectedSiteName}
                    </td>
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
                            href={`/user/treasury-movements?schoolYearName=${encodeURIComponent(schoolYearName)}&siteId=${encodeURIComponent(selectedSiteId)}&treasuryId=${item.id}`}
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
                    Aucune trésorerie trouvée pour l'année scolaire « {schoolYearName} » sur le site « {selectedSiteName} ».
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
              <h2 className="text-[16px] font-black">
                {editId ? "Modifier Trésorerie" : "Nouveau Trésorerie"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[22px] leading-none text-slate-300 hover:text-white"
              >
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
                          {value}
                          {year.active ? " • active" : ""}
                        </option>
                      );
                    })
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-700">Sites</span>
                <select
                  value={selectedSiteId}
                  onChange={(e) => changeSite(e.target.value)}
                  className="h-8 w-full border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-500"
                >
                  {sites.length === 0 ? (
                    <option value="">Strelitzia School</option>
                  ) : (
                    sites.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                        {item.active ? " • actif" : ""}
                      </option>
                    ))
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
                onClick={() => setIsDefault((value) => !value)}
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
