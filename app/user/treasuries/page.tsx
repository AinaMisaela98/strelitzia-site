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
  return Boolean(
    item.isPrincipal || item.isDefault || item.default || item.principale,
  );
}

function getTreasuryBalance(item: Treasury | null | undefined) {
  if (!item) return 0;
  return toNumber(item.solde ?? item.balance ?? item.soldeReel);
}

function canDeleteTreasury(item: Treasury | null | undefined) {
  return Math.abs(getTreasuryBalance(item)) < 0.01;
}

function normalizeMovementType(movement: TreasuryMovement) {
  const raw = text(
    movement.movementType ||
      movement.type ||
      movement.sens ||
      movement.operation,
  ).toUpperCase();

  if (
    raw === "DEBIT" ||
    raw === "SORTIE" ||
    raw === "DEPENSE" ||
    raw === "DÉPENSE"
  ) {
    return "DEBIT";
  }

  if (
    raw === "CREDIT" ||
    raw === "ENTREE" ||
    raw === "ENTRÉE" ||
    raw === "RECETTE"
  ) {
    return "CREDIT";
  }

  if (toNumber(movement.debit) > 0) return "DEBIT";
  if (toNumber(movement.credit) > 0) return "CREDIT";

  return "CREDIT";
}

function getMovementAmount(movement: TreasuryMovement) {
  const type = normalizeMovementType(movement);

  if (type === "DEBIT") {
    return (
      toNumber(movement.debit) ||
      toNumber(movement.amount) ||
      toNumber(movement.montant)
    );
  }

  return (
    toNumber(movement.credit) ||
    toNumber(movement.amount) ||
    toNumber(movement.montant)
  );
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
  const raw = Array.isArray(data)
    ? data
    : data?.sites || data?.data || data?.items || [];

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
  const raw = Array.isArray(data)
    ? data
    : data?.treasuries || data?.data || data?.items || [];

  return (Array.isArray(raw) ? raw : []).map((item: any) => ({
    ...item,
    id: Number(item.id),
    name: text(item.name),
    type: normalizeType(item.type),
    active: item.active !== false,
    siteId: item.siteId ?? null,
    site: item.site ?? null,
    schoolYearName:
      item.schoolYearName || item.anneeScolaire || item.year || DEFAULT_YEAR,
    totalEntree: Number(item.totalEntree ?? item.totalCredit ?? 0),
    totalSortie: Number(item.totalSortie ?? item.totalDebit ?? 0),
    solde: Number(item.solde ?? item.balance ?? item.soldeReel ?? 0),
  }));
}

function normalizeMovementRows(data: any): TreasuryMovement[] {
  const raw = Array.isArray(data)
    ? data
    : data?.movements ||
      data?.treasuryMovements ||
      data?.data ||
      data?.items ||
      [];

  return Array.isArray(raw) ? raw : [];
}

function applyRealBalancesToTreasuries(
  treasuries: Treasury[],
  movements: TreasuryMovement[],
) {
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
  const totalEntree = treasuries.reduce(
    (sum, item) => sum + toNumber(item.totalEntree),
    0,
  );
  const totalSortie = treasuries.reduce(
    (sum, item) => sum + toNumber(item.totalSortie),
    0,
  );
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
  const [selectedStatusTreasuryId, setSelectedStatusTreasuryId] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("CAISSE");
  const [isDefault, setIsDefault] = useState(false);

  const [actionMenu, setActionMenu] = useState<{
    id: number;
    top: number;
    left: number;
  } | null>(null);

  const loadSeqRef = useRef(0);
  const initializedYearRef = useRef(false);
  const initializedSiteRef = useRef(false);

  const selectedSite = useMemo(() => {
    return (
      sites.find((item) => String(item.id) === String(selectedSiteId)) || null
    );
  }, [sites, selectedSiteId]);

  const selectedSiteName = selectedSite?.name || "Strelitzia School";

  const sourceRows = useMemo(() => {
    return dashboard?.treasuries ?? treasuries;
  }, [dashboard, treasuries]);

  const activeSourceRows = useMemo(() => {
    return sourceRows.filter((item) => item.active !== false);
  }, [sourceRows]);

  const principalId = useMemo(() => {
    const found =
      activeSourceRows.find(isPrincipalTreasury) ||
      sourceRows.find(isPrincipalTreasury);
    return found?.id || null;
  }, [activeSourceRows, sourceRows]);

  const statusTreasury = useMemo(() => {
    return (
      sourceRows.find(
        (item) => String(item.id) === String(selectedStatusTreasuryId),
      ) ||
      activeSourceRows.find((item) => item.id === principalId) ||
      activeSourceRows[0] ||
      sourceRows[0] ||
      null
    );
  }, [activeSourceRows, principalId, selectedStatusTreasuryId, sourceRows]);

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
        .includes(q),
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
      const res = await fetch(`/api/sites?_ts=${Date.now()}`, {
        cache: "no-store",
      });
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
        fetch(`/api/treasury-dashboard${qs}`, { cache: "no-store" }).catch(
          () => null,
        ),
        fetch(`/api/treasury-movements${qs}`, { cache: "no-store" }),
      ]);

      const treasuryJson = await treasuryRes.json().catch(() => ({}));
      const dashboardJson = dashboardRes
        ? await dashboardRes.json().catch(() => ({}))
        : {};
      const movementJson = await movementRes.json().catch(() => ({}));

      if (seq !== loadSeqRef.current) return;

      if (!treasuryRes.ok)
        throw new Error(treasuryJson.error || "Erreur chargement trésoreries");
      if (dashboardRes && !dashboardRes.ok)
        throw new Error(dashboardJson.error || "Erreur chargement dashboard");
      if (!movementRes.ok)
        throw new Error(movementJson.error || "Erreur chargement mouvements");

      const movementRows = normalizeMovementRows(movementJson);
      const loadedTreasuries = applyRealBalancesToTreasuries(
        normalizeTreasuries(treasuryJson),
        movementRows,
      );

      const dashboardSourceTreasuries = normalizeTreasuries(dashboardJson);
      const loadedDashboardTreasuries = applyRealBalancesToTreasuries(
        dashboardSourceTreasuries.length > 0
          ? dashboardSourceTreasuries
          : loadedTreasuries,
        movementRows,
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
    setSelectedStatusTreasuryId("");
    loadData(schoolYearName, selectedSiteId);
  }, [schoolYearName, selectedSiteId, loadData]);

  useEffect(() => {
    if (sourceRows.length === 0) {
      setSelectedStatusTreasuryId("");
      return;
    }

    const selectedStillExists = sourceRows.some(
      (item) => String(item.id) === String(selectedStatusTreasuryId),
    );

    if (selectedStillExists) return;

    const nextTreasury =
      activeSourceRows.find((item) => item.id === principalId) ||
      activeSourceRows[0] ||
      sourceRows[0];

    setSelectedStatusTreasuryId(nextTreasury ? String(nextTreasury.id) : "");
  }, [activeSourceRows, principalId, selectedStatusTreasuryId, sourceRows]);

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

  function toggleActionMenu(
    e: React.MouseEvent<HTMLButtonElement>,
    id: number,
  ) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = 204;
    const margin = 12;
    const left = Math.min(
      Math.max(margin, rect.right - menuWidth),
      Math.max(margin, window.innerWidth - menuWidth - margin),
    );
    const top =
      rect.bottom + menuHeight + margin > window.innerHeight
        ? Math.max(margin, rect.top - menuHeight - 8)
        : rect.bottom + 8;

    setActionMenu((current) =>
      current?.id === id
        ? null
        : {
            id,
            top,
            left,
          },
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
      `Définir "${item.name}" comme trésorerie principale pour ${schoolYearName} sur ${selectedSiteName} ?`,
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

  async function requestDeleteTreasury(item: Treasury) {
    const params = new URLSearchParams();
    params.set("id", String(item.id));
    params.set("schoolYearName", cleanYear(schoolYearName));
    if (selectedSiteId) params.set("siteId", selectedSiteId);

    const payload = {
      id: item.id,
      treasuryId: item.id,
      schoolYearName: cleanYear(schoolYearName),
      siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
      site: item.site || selectedSiteName,
      siteName: item.site || selectedSiteName,
    };

    const attempts = [
      () =>
        fetch(`/api/treasuries?${params.toString()}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      () =>
        fetch(`/api/treasuries/${item.id}?${params.toString()}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      () =>
        fetch(`/api/treasuries?id=${item.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
    ];

    let lastData: any = {};
    let lastStatus = 0;

    for (const run of attempts) {
      const res = await run();
      lastStatus = res.status;
      lastData = await res.json().catch(() => ({}));

      if (res.ok) return lastData;

      const message = text(lastData.error || lastData.message).toLowerCase();
      const retryable =
        res.status === 404 ||
        res.status === 405 ||
        message.includes("not found") ||
        message.includes("method") ||
        message.includes("id") ||
        message.includes("introuvable");

      if (!retryable) break;
    }

    throw new Error(
      lastData.error ||
        lastData.message ||
        `Erreur suppression${lastStatus ? ` (${lastStatus})` : ""}`,
    );
  }

  async function deleteTreasury(id: number) {
    if (deletingId) return;

    const item = sourceRows.find((row) => Number(row.id) === Number(id));
    const solde = getTreasuryBalance(item);

    setActionMenu(null);

    if (!item) {
      alert("Trésorerie introuvable. Veuillez actualiser la page.");
      return;
    }

    if (!canDeleteTreasury(item)) {
      alert(
        `Suppression bloquée : cette trésorerie contient encore un solde de ${formatMoney(solde)} Ar. Ramenez le solde à 0 Ar avant de la supprimer.`,
      );
      return;
    }

    const ok = confirm(
      `Supprimer définitivement la trésorerie "${item.name}" ? Son solde est à 0 Ar, donc la suppression est autorisée.`,
    );

    if (!ok) return;

    setDeletingId(item.id);

    try {
      await requestDeleteTreasury(item);

      setTreasuries((current) =>
        current.filter((row) => Number(row.id) !== Number(item.id)),
      );
      setDashboard((current) =>
        current
          ? {
              ...current,
              treasuries: (current.treasuries || []).filter(
                (row) => Number(row.id) !== Number(item.id),
              ),
            }
          : current,
      );

      await loadData(schoolYearName, selectedSiteId);
      alert("Trésorerie supprimée avec succès.");
    } catch (error: any) {
      alert(error?.message || "Erreur suppression");
    } finally {
      setDeletingId(null);
    }
  }

  const totalEntree = statusTreasury
    ? toNumber(statusTreasury.totalEntree ?? statusTreasury.totalCredit)
    : toNumber(dashboard?.totals?.totalEntree);
  const totalSortie = statusTreasury
    ? toNumber(statusTreasury.totalSortie ?? statusTreasury.totalDebit)
    : toNumber(dashboard?.totals?.totalSortie);
  const soldeGlobal = statusTreasury
    ? toNumber(
        statusTreasury.solde ??
          statusTreasury.balance ??
          statusTreasury.soldeReel,
      )
    : toNumber(dashboard?.totals?.soldeGlobal ?? dashboard?.totals?.solde);
  const activeTreasuriesCount = activeSourceRows.length;
  const principalTreasury =
    sourceRows.find((item) => item.id === principalId) || null;

  return (
    <main
      className="min-h-screen overflow-hidden bg-[#080d16] text-[13px] font-normal text-slate-100 antialiased"
      onClick={() => actionMenu && setActionMenu(null)}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.13),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.09),transparent_28%),linear-gradient(135deg,#070b12_0%,#0d1422_55%,#070b12_100%)]" />

      <div className="relative mx-auto w-full max-w-[1380px] px-3 py-3 sm:px-4 lg:px-5">
        <header className="mb-3 flex flex-col gap-3 border-b border-white/10 pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span>Accueil</span>
              <span className="text-slate-600">›</span>
              <span>Trésorerie</span>
              <span className="text-slate-600">›</span>
              <span className="font-normal text-white">Listes</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Gestion des trésoreries
            </h1>
            <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-slate-400">
              Affichage isolé par site et par année scolaire active. Les soldes
              sont recalculés à partir des mouvements CREDIT et DEBIT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadData(schoolYearName, selectedSiteId)}
              disabled={loading}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 font-normal text-white shadow-lg shadow-black/20 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className={loading ? "animate-spin" : ""}>↻</span>
              {loading ? "Chargement..." : "Actualiser"}
            </button>
            <button
              onClick={openCreate}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-red-700 to-red-600 px-3 font-normal text-white shadow-xl shadow-red-950/40 transition hover:from-red-600 hover:to-red-500"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white text-sm leading-none">
                +
              </span>
              Ajouter
            </button>
          </div>
        </header>

        <section className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3 shadow-2xl shadow-black/20 backdrop-blur">
            <p className="text-[10px] font-normal uppercase tracking-[0.11em] text-slate-500">
              Trésoreries
            </p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-lg font-semibold text-white">
                {activeTreasuriesCount}
              </p>
              <span className="rounded-full bg-red-600/15 px-2.5 py-0.5 text-[11px] font-normal text-red-300">
                Actives
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.055] p-3 shadow-2xl shadow-black/20 backdrop-blur">
            <p className="text-[10px] font-normal uppercase tracking-[0.11em] text-emerald-300/70">
              Crédit sélectionné
            </p>
            <p className="mt-2 text-base font-semibold text-emerald-300">
              {formatMoney(totalEntree)} Ar
            </p>
          </div>
          <div className="rounded-lg border border-red-400/15 bg-red-400/[0.055] p-3 shadow-2xl shadow-black/20 backdrop-blur">
            <p className="text-[10px] font-normal uppercase tracking-[0.11em] text-red-300/70">
              Débit sélectionné
            </p>
            <p className="mt-2 text-base font-semibold text-red-300">
              {formatMoney(totalSortie)} Ar
            </p>
          </div>
          <div className="rounded-lg border border-blue-400/15 bg-blue-400/[0.055] p-3 shadow-2xl shadow-black/20 backdrop-blur">
            <p className="text-[10px] font-normal uppercase tracking-[0.11em] text-blue-300/70">
              Solde sélectionné
            </p>
            <p
              className={
                soldeGlobal < 0
                  ? "mt-2 text-base font-semibold text-red-300"
                  : "mt-2 text-base font-semibold text-blue-300"
              }
            >
              {formatMoney(soldeGlobal)} Ar
            </p>
          </div>
        </section>

        <section className="mb-3 rounded-lg border border-white/10 bg-white/[0.045] p-2.5 shadow-xl shadow-black/25 backdrop-blur sm:p-3">
          <div className="grid gap-2.5 lg:grid-cols-[1fr_1fr_1fr_1.15fr_auto] lg:items-end">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                Année scolaire
              </span>
              <select
                value={schoolYearName}
                onChange={(e) => setSchoolYearName(cleanYear(e.target.value))}
                className="h-8 w-full rounded-lg border border-white/10 bg-[#111827] px-2.5 text-[13px] font-normal text-white outline-none transition focus:border-red-500"
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
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                Site
              </span>
              <select
                value={selectedSiteId}
                onChange={(e) => changeSite(e.target.value)}
                className="h-8 w-full rounded-lg border border-white/10 bg-[#111827] px-2.5 text-[13px] font-normal text-white outline-none transition focus:border-red-500"
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
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                Trésorerie des statuts
              </span>
              <select
                value={selectedStatusTreasuryId}
                onChange={(e) => setSelectedStatusTreasuryId(e.target.value)}
                className="h-8 w-full rounded-lg border border-white/10 bg-[#111827] px-2.5 text-[13px] font-normal text-white outline-none transition focus:border-red-500"
              >
                {sourceRows.length === 0 ? (
                  <option value="">Aucune trésorerie</option>
                ) : (
                  sourceRows.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name}
                      {item.id === principalId || isPrincipalTreasury(item)
                        ? " • principale"
                        : ""}
                      {item.active === false ? " • inactive" : ""}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                Recherche
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, site, banque, compte..."
                className="h-8 w-full rounded-lg border border-white/10 bg-[#111827] px-2.5 text-[13px] font-normal text-white outline-none placeholder:text-slate-600 transition focus:border-red-500"
              />
            </label>

            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[12px] text-red-100">
              <span className="font-medium">Statut :</span>{" "}
              {statusTreasury?.name || principalTreasury?.name || "Non définie"}
            </div>
          </div>
        </section>

        <section className="overflow-visible rounded-lg border border-white/10 bg-white/[0.045] shadow-xl shadow-black/30 backdrop-blur">
          <div className="flex flex-col gap-2.5 border-b border-white/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Liste des trésoreries
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-400">
                Affichage de {rows.length} résultat{rows.length > 1 ? "s" : ""}{" "}
                pour {selectedSiteName} • {schoolYearName}
              </p>
            </div>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead>
                <tr className="bg-white/[0.055] text-[10px] uppercase tracking-[0.07em] text-slate-300">
                  <th className="px-3 py-2.5 font-medium">Principale</th>
                  <th className="px-3 py-2.5 font-medium">Nom</th>
                  <th className="px-3 py-2.5 font-medium">Année</th>
                  <th className="px-3 py-2.5 font-medium">Site</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Compte</th>
                  <th className="px-3 py-2.5 font-medium">Banque</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Solde</th>
                  <th className="px-3 py-2.5 text-center font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((item) => {
                  const checked =
                    item.id === principalId || isPrincipalTreasury(item);
                  const isNegative = Number(item.solde || 0) < 0;

                  return (
                    <tr
                      key={item.id}
                      className="border-t border-white/10 text-[13px] transition hover:bg-white/[0.04]"
                    >
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setAsPrincipal(item)}
                          title={
                            checked
                              ? "Trésorerie principale"
                              : "Définir comme principale"
                          }
                          className={
                            checked
                              ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 font-semibold text-white shadow-lg shadow-red-950/40"
                              : "inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/5 font-medium text-slate-500 transition hover:border-red-500 hover:text-red-300"
                          }
                        >
                          ✓
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-slate-800 text-sm font-normal text-white shadow-lg">
                            {normalizeType(item.type) === "BANQUE" ? "B" : "C"}
                          </span>
                          <div>
                            <p className="font-normal text-white">
                              {item.name}
                            </p>
                            {checked && (
                              <p className="mt-0.5 text-[11px] font-normal text-red-300">
                                Trésorerie principale
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-normal text-slate-300">
                        {item.schoolYearName || schoolYearName}
                      </td>
                      <td className="px-3 py-2.5 font-normal text-slate-300">
                        {item.site || selectedSiteName}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-md bg-blue-500/15 px-2 py-1 text-[11px] font-normal text-blue-300">
                          {normalizeType(item.type)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">
                        <p className="font-normal">{item.accountName || "—"}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {item.accountNumber || "Aucun numéro"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">
                        <p className="font-normal">{item.bankName || "—"}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {item.bic || item.address || ""}
                        </p>
                      </td>
                      <td
                        className={
                          isNegative
                            ? "px-3 py-2.5 text-right font-semibold text-red-300"
                            : "px-3 py-2.5 text-right font-semibold text-emerald-300"
                        }
                        title={`Solde réel = total CREDIT (${formatMoney(item.totalEntree)}) - total DEBIT (${formatMoney(item.totalSortie)})`}
                      >
                        {formatMoney(item.solde)} Ar
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => toggleActionMenu(e, item.id)}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[12px] font-normal text-white shadow-lg shadow-black/20 transition hover:border-red-500/40 hover:bg-red-500/15"
                        >
                          Actions
                          <span
                            className={
                              actionMenu?.id === item.id
                                ? "rotate-180 transition"
                                : "transition"
                            }
                          >
                            ⌄
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      Aucune trésorerie trouvée pour l'année scolaire «{" "}
                      {schoolYearName} » sur le site « {selectedSiteName} ».
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 lg:hidden">
            {rows.map((item) => {
              const checked =
                item.id === principalId || isPrincipalTreasury(item);
              const isNegative = Number(item.solde || 0) < 0;

              return (
                <article
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-[#0f1724] p-3 shadow-xl shadow-black/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-slate-800 text-sm font-semibold text-white">
                        {normalizeType(item.type) === "BANQUE" ? "B" : "C"}
                      </span>
                      <div>
                        <h3 className="font-normal text-white">{item.name}</h3>
                        <p className="text-xs text-slate-400">
                          {item.site || selectedSiteName} •{" "}
                          {item.schoolYearName || schoolYearName}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAsPrincipal(item)}
                      className={
                        checked
                          ? "rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white"
                          : "rounded-full border border-white/10 px-3 py-1 text-xs font-normal text-slate-400"
                      }
                    >
                      {checked ? "Principale" : "Définir"}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                    <div className="rounded-lg bg-white/[0.04] p-2.5">
                      <p className="text-xs text-slate-500">Type</p>
                      <p className="mt-1 font-medium text-blue-300">
                        {normalizeType(item.type)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] p-2.5">
                      <p className="text-xs text-slate-500">Solde</p>
                      <p
                        className={
                          isNegative
                            ? "mt-1 font-semibold text-red-300"
                            : "mt-1 font-semibold text-emerald-300"
                        }
                      >
                        {formatMoney(item.solde)} Ar
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] p-2.5">
                      <p className="text-xs text-slate-500">Compte</p>
                      <p className="mt-1 font-normal text-slate-200">
                        {item.accountName || "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] p-2.5">
                      <p className="text-xs text-slate-500">Banque</p>
                      <p className="mt-1 font-normal text-slate-200">
                        {item.bankName || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={(e) => toggleActionMenu(e, item.id)}
                      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-[12px] font-normal text-white transition hover:border-red-500/40 hover:bg-red-500/15"
                    >
                      Actions
                      <span
                        className={
                          actionMenu?.id === item.id
                            ? "rotate-180 transition"
                            : "transition"
                        }
                      >
                        ⌄
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}

            {!loading && rows.length === 0 && (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-8 text-center text-slate-400">
                Aucune trésorerie trouvée pour l'année scolaire «{" "}
                {schoolYearName} » sur le site « {selectedSiteName} ».
              </div>
            )}
          </div>
        </section>
      </div>

      {actionMenu &&
        (() => {
          const item = sourceRows.find((row) => row.id === actionMenu.id);
          if (!item) return null;

          const deletionAllowed = canDeleteTreasury(item);
          const currentBalance = getTreasuryBalance(item);

          return (
            <div
              onClick={(e) => e.stopPropagation()}
              className="fixed z-[80] w-[190px] overflow-visible rounded-lg border border-white/10 bg-[#101827] p-1 shadow-2xl shadow-black/50 backdrop-blur-xl"
              style={{ top: actionMenu.top, left: actionMenu.left }}
            >
              <button
                type="button"
                onClick={() => openEdit(item)}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-normal text-blue-200 transition hover:bg-blue-500/15"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-blue-500/15">
                  ✎
                </span>
                Modifier
              </button>
              <a
                href={`/user/treasury-movements?schoolYearName=${encodeURIComponent(schoolYearName)}&siteId=${encodeURIComponent(selectedSiteId)}&treasuryId=${item.id}`}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-normal text-emerald-200 transition hover:bg-emerald-500/15"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500/15">
                  ↗
                </span>
                Mouvements
              </a>
              <button
                type="button"
                onClick={() => setAsPrincipal(item)}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-normal text-amber-100 transition hover:bg-amber-500/15"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-amber-500/15">
                  ✓
                </span>
                Définir principale
              </button>
              {!deletionAllowed && (
                <div className="mx-1 my-1 rounded-md border border-amber-400/20 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-4 text-amber-100">
                  Suppression verrouillée : solde {formatMoney(currentBalance)} Ar.
                </div>
              )}
              <button
                type="button"
                onClick={() => deleteTreasury(item.id)}
                disabled={!deletionAllowed || deletingId === item.id}
                title={
                  deletionAllowed
                    ? deletingId === item.id
                      ? "Suppression en cours..."
                      : "Supprimer cette trésorerie"
                    : "Impossible de supprimer tant que le solde n'est pas à 0 Ar"
                }
                className={
                  deletionAllowed && deletingId !== item.id
                    ? "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-normal text-red-200 transition hover:bg-red-500/15"
                    : "flex w-full cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-normal text-slate-500 opacity-70"
                }
              >
                <span
                  className={
                    deletionAllowed && deletingId !== item.id
                      ? "flex h-5 w-5 items-center justify-center rounded-lg bg-red-500/15"
                      : "flex h-5 w-5 items-center justify-center rounded-lg bg-slate-700/60"
                  }
                >
                  🗑
                </span>
                {deletingId === item.id
                  ? "Suppression..."
                  : deletionAllowed
                    ? "Supprimer"
                    : "Suppression bloquée"}
              </button>
            </div>
          );
        })()}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm">
          <form
            onSubmit={saveTreasury}
            className="w-full max-w-[460px] overflow-hidden rounded-lg border border-white/10 bg-[#0f1724] shadow-2xl shadow-black/50"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-red-300">
                  Trésorerie
                </p>
                <h2 className="mt-1 text-sm font-normal text-white">
                  {editId ? "Modifier la trésorerie" : "Nouvelle trésorerie"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-xl leading-none text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-2.5 px-4 py-4">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Année scolaire
                </span>
                <select
                  value={schoolYearName}
                  onChange={(e) => setSchoolYearName(cleanYear(e.target.value))}
                  className="h-8 w-full rounded-lg border border-white/10 bg-[#111827] px-2.5 text-[13px] font-normal text-white outline-none transition focus:border-red-500"
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
                <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Site
                </span>
                <select
                  value={selectedSiteId}
                  onChange={(e) => changeSite(e.target.value)}
                  className="h-8 w-full rounded-lg border border-white/10 bg-[#111827] px-2.5 text-[13px] font-normal text-white outline-none transition focus:border-red-500"
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
                <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Nom trésorerie
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Caisse principale, Banque BOA..."
                  className="h-8 w-full rounded-lg border border-white/10 bg-[#111827] px-2.5 text-[13px] font-normal text-white outline-none placeholder:text-slate-600 transition focus:border-red-500"
                />
              </label>

              <button
                type="button"
                onClick={() => setIsDefault((value) => !value)}
                className={
                  isDefault
                    ? "flex w-full items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2.5 text-left font-medium text-red-100"
                    : "flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left font-normal text-slate-300 transition hover:border-red-500/40 hover:bg-red-500/10"
                }
              >
                <span
                  className={
                    isDefault
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white"
                      : "inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-transparent"
                  }
                >
                  ✓
                </span>
                Cocher si cette trésorerie est principale / par défaut
              </button>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Type trésorerie
                </span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-8 w-full rounded-lg border border-white/10 bg-[#111827] px-2.5 text-[13px] font-normal text-white outline-none transition focus:border-red-500"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-8 rounded-lg border border-white/10 bg-white/5 px-4 font-normal text-white transition hover:bg-white/10"
              >
                Fermer
              </button>
              <button
                disabled={saving}
                className="h-8 rounded-lg bg-gradient-to-r from-red-700 to-red-600 px-5 font-medium text-white shadow-lg shadow-red-950/35 transition hover:from-red-600 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-50"
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
