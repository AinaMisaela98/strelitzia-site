"use client";

import { useEffect, useMemo, useState } from "react";

type FeeItem = {
  id: number;
  libelle: string;
  code: string;
  montantTotal: number;
  montantPaye: number;
  reste: number;
  status: string;
};

type FeeRow = {
  id: number;
  matricule: string;
  dateInscription: string;
  fullName: string;
  classe: string;
  serie: string;
  site: string;
  status: Record<string, boolean>;
  paidCount?: number;
  unpaidCount?: number;
  montantTotal?: number;
  montantPaye?: number;
  reste?: number;
  globalStatus?: string;
  fees?: FeeItem[];
};

type Filters = {
  anneeScolaire: string;
  site: string;
  classe: string;
  section: string;
  frais: string;
  matricule: string;
};

type ApiFilters = {
  schoolYears?: string[];
  sites?: string[];
  classes?: string[];
  series?: string[];
  trainingFees?: {
    id: number;
    libelle: string;
    code: string;
    classe: string;
    schoolYearName: string;
  }[];
};

const EMPTY_FILTERS: Filters = {
  anneeScolaire: "",
  site: "",
  classe: "",
  section: "",
  frais: "",
  matricule: "",
};

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR");
}

function unique(values: (string | undefined | null)[]) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );
}

function normalizeCode(value: any) {
  return String(value || "").trim().toUpperCase();
}

function isStrictPaidFee(fee?: FeeItem | null) {
  if (!fee) return false;

  const status = String(fee.status || "").trim().toUpperCase();
  const montantTotal = Number(fee.montantTotal || 0);
  const montantPaye = Number(fee.montantPaye || 0);

  return (
    status === "PAYE" ||
    status === "PAYÉ" ||
    status === "PAID" ||
    (montantTotal > 0 && montantPaye >= montantTotal)
  );
}

function findFeeByCode(row: FeeRow, code: string) {
  const target = normalizeCode(code);

  return (row.fees || []).find((fee) => {
    const feeCode = normalizeCode(fee.code);
    const feeLibelle = normalizeCode(fee.libelle);

    return feeCode === target || feeLibelle === target;
  });
}

function isRowCodePaid(row: FeeRow, code: string) {
  return isStrictPaidFee(findFeeByCode(row, code));
}

function normalizeSearch(value: any) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function rowMatchesSearch(row: FeeRow, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;

  const haystack = normalizeSearch(
    [row.matricule, row.fullName, row.classe, row.serie, row.site].join(" ")
  );

  return haystack.includes(q);
}

export default function EtatPaiementFraisPage() {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [feeCodes, setFeeCodes] = useState<string[]>([]);
  const [apiFilters, setApiFilters] = useState<ApiFilters>({});
  const [activeYear, setActiveYear] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fixing, setFixing] = useState(false);
  const [fixMessage, setFixMessage] = useState("");

  async function loadData(nextFilters: Filters = filters) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (nextFilters.anneeScolaire) {
        params.append("anneeScolaire", nextFilters.anneeScolaire);
        params.append("schoolYearName", nextFilters.anneeScolaire);
        params.append("year", nextFilters.anneeScolaire);
      }

      if (nextFilters.site) params.append("site", nextFilters.site);
      if (nextFilters.classe) params.append("classe", nextFilters.classe);
      if (nextFilters.section) params.append("section", nextFilters.section);
      if (nextFilters.frais) params.append("frais", nextFilters.frais);

      const res = await fetch(`/api/fee-payment-status?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erreur lors du chargement");
      }

      const apiActiveYear = String(data.activeYear || "").trim();

      if (apiActiveYear) {
        setActiveYear(apiActiveYear);
      }

      setApiFilters(data.filters || {});

      // Année scolaire active = principale/default.
      // Premier chargement: raha mbola tsy misy année voafidy, averina chargena
      // amin'ny année scolaire active mba tsy hiseho ny données année hafa.
      if (!nextFilters.anneeScolaire && apiActiveYear) {
        const activeYearFilters: Filters = {
          ...nextFilters,
          anneeScolaire: apiActiveYear,
        };

        setFilters(activeYearFilters);
        await loadData(activeYearFilters);
        return;
      }

      setRows(Array.isArray(data.rows) ? data.rows : []);
      setFeeCodes(
        Array.isArray(data.feeCodes)
          ? data.feeCodes
          : Array.isArray(data.months)
            ? data.months
            : []
      );

      if (apiActiveYear) {
        setFilters((prev) =>
          prev.anneeScolaire
            ? prev
            : {
                ...prev,
                anneeScolaire: apiActiveYear,
              }
        );
      }
    } catch (e) {
      console.error(e);
      setRows([]);
      setFeeCodes([]);
      setError("Impossible de charger l'état de paiement des frais.");
    } finally {
      setLoading(false);
    }
  }

  async function correctData() {
    if (fixing) return;

    const ok = window.confirm(
      "Corriger et mettre à jour les frais manquants pour cette année scolaire ?"
    );
    if (!ok) return;

    try {
      setFixing(true);
      setError("");
      setFixMessage("");

      const selectedYear = filters.anneeScolaire || activeYear;

      const res = await fetch("/api/fee-payment-status/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anneeScolaire: selectedYear,
          schoolYearName: selectedYear,
          year: selectedYear,
          site: filters.site,
          classe: filters.classe,
          section: filters.section,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Correction impossible");
      }

      setFixMessage(
        `Correction terminée : ${Number(data.created || 0)} frais ajoutés, ${Number(
          data.updated || 0
        )} frais recalculés.`
      );

      await loadData({
        ...filters,
        anneeScolaire: selectedYear,
      });
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Correction impossible";
      setError(message);
    } finally {
      setFixing(false);
    }
  }

  useEffect(() => {
    loadData(EMPTY_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sites = useMemo(() => {
    if (apiFilters.sites?.length) return apiFilters.sites;
    return unique(rows.map((r) => r.site));
  }, [apiFilters.sites, rows]);

  const classes = useMemo(() => {
    if (apiFilters.classes?.length) return apiFilters.classes;
    return unique(rows.map((r) => r.classe));
  }, [apiFilters.classes, rows]);

  const series = useMemo(() => {
    if (apiFilters.series?.length) return apiFilters.series;
    return unique(rows.map((r) => r.serie));
  }, [apiFilters.series, rows]);

  const fraisList = useMemo(() => {
    if (apiFilters.trainingFees?.length) {
      return unique(apiFilters.trainingFees.map((f) => f.libelle));
    }

    return unique(rows.flatMap((r) => (r.fees || []).map((f) => f.libelle)));
  }, [apiFilters.trainingFees, rows]);

  const schoolYears = useMemo(() => {
    const years = apiFilters.schoolYears?.length ? apiFilters.schoolYears : [];

    if (!activeYear) return years;

    return [activeYear, ...years.filter((year) => year !== activeYear)];
  }, [apiFilters.schoolYears, activeYear]);

  const displayedRows = useMemo(() => {
    return rows.filter((row) => rowMatchesSearch(row, filters.matricule));
  }, [rows, filters.matricule]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K], autoLoad = true) {
    const nextFilters: Filters = {
      ...filters,
      [key]: value,
      ...(key === "anneeScolaire"
        ? { site: "", classe: "", section: "", frais: "" }
        : {}),
      ...(key === "site" ? { classe: "", section: "", frais: "" } : {}),
      ...(key === "classe" ? { section: "", frais: "" } : {}),
    };

    setFilters(nextFilters);

    if (autoLoad) {
      loadData(nextFilters);
    }
  }

  function resetFilters() {
    const nextFilters = {
      ...EMPTY_FILTERS,
      anneeScolaire: activeYear || "",
    };

    setFilters(nextFilters);
    loadData(nextFilters);
  }

  function exportExcel() {
    const header = [
      "Matricule",
      "Date Inscription",
      "Nom et Prénom(s)",
      "Site",
      "Classe",
      "Série",
      ...feeCodes,
    ];

    const body = displayedRows.map((r) => [
      r.matricule,
      formatDate(r.dateInscription),
      r.fullName,
      r.site,
      r.classe,
      r.serie,
      ...feeCodes.map((code) => (isRowCodePaid(r, code) ? "PAYE" : "NON_PAYE")),
    ]);

    const csv = [header, ...body]
      .map((line) =>
        line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etat-paiement-frais-${filters.anneeScolaire || activeYear || "annee"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-2 text-[12px] sm:p-3">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-slate-800">
              Etat paiement des frais
            </h1>
            <p className="text-[11px] text-slate-500">
              Les colonnes viennent automatiquement des frais créés dans TrainingFee.
              Année principale : {activeYear || "non définie"}.
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => loadData(filters)}
              disabled={loading}
              className="rounded bg-cyan-600 px-3 py-2 font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {loading ? "Chargement..." : "🔄 Actualiser"}
            </button>

            <button
              onClick={correctData}
              disabled={fixing || loading}
              title="Ajoute automatiquement les frais manquants et recalcule les paiements"
              className="rounded bg-amber-500 px-3 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {fixing ? "Correction..." : "🛠 Corriger"}
            </button>

            <button
              onClick={exportExcel}
              className="rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Export Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-6">
          <select
            value={filters.anneeScolaire}
            onChange={(e) => updateFilter("anneeScolaire", e.target.value)}
            className="h-[38px] rounded bg-slate-800 px-2 font-semibold text-white outline-none"
          >
            <option value="">Année scolaire active : {activeYear || "TOUT"}</option>
            {schoolYears.map((y) => (
              <option key={y} value={y}>
                {y === activeYear ? "⭐ Année active : " : "Année scolaire : "}
                {y}
              </option>
            ))}
          </select>

          <select
            value={filters.site}
            onChange={(e) => updateFilter("site", e.target.value)}
            className="h-[38px] rounded bg-slate-800 px-2 font-semibold text-white outline-none"
          >
            <option value="">Sites : TOUT</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                Sites : {s}
              </option>
            ))}
          </select>

          <select
            value={filters.classe}
            onChange={(e) => updateFilter("classe", e.target.value)}
            className="h-[38px] rounded bg-slate-800 px-2 font-semibold text-white outline-none"
          >
            <option value="">Classe : TOUT</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                Classe : {c}
              </option>
            ))}
          </select>

          <select
            value={filters.section}
            onChange={(e) => updateFilter("section", e.target.value)}
            className="h-[38px] rounded bg-slate-800 px-2 font-semibold text-white outline-none"
          >
            <option value="">Série : TOUT</option>
            {series.map((s) => (
              <option key={s} value={s}>
                Série : {s}
              </option>
            ))}
          </select>

          <select
            value={filters.frais}
            onChange={(e) => updateFilter("frais", e.target.value)}
            className="h-[38px] rounded bg-slate-800 px-2 font-semibold text-white outline-none"
          >
            <option value="">Frais Formation : TOUT</option>
            {fraisList.map((f) => (
              <option key={f} value={f}>
                Frais Formation : {f}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            <button
              onClick={() => loadData(filters)}
              className="h-[38px] flex-1 rounded bg-slate-800 px-3 font-semibold text-white hover:bg-slate-700"
            >
              🔍 Filtrer
            </button>

            <button
              onClick={resetFilters}
              className="h-[38px] rounded bg-red-500 px-3 font-semibold text-white hover:bg-red-600"
            >
              ✖
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-3 pb-3 sm:flex-row">
          <input
            value={filters.matricule}
            onChange={(e) => updateFilter("matricule", e.target.value, false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadData(filters);
            }}
            placeholder="Nom ou matricule"
            className="h-[38px] w-full rounded border border-slate-300 px-2 outline-none focus:border-blue-500 sm:w-[220px]"
          />

          <button
            onClick={() => loadData(filters)}
            className="h-[38px] rounded bg-slate-800 px-3 font-semibold text-white hover:bg-slate-700"
          >
            Rechercher
          </button>
        </div>

        {error && (
          <div className="mx-3 mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">
            {error}
          </div>
        )}

        {fixMessage && (
          <div className="mx-3 mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
            {fixMessage}
          </div>
        )}

        <div className="overflow-x-auto border-t border-slate-200">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-600 px-2 py-2 text-left">Matricule</th>
                <th className="border border-slate-600 px-2 py-2 text-left">Date Inscription</th>
                <th className="border border-slate-600 px-2 py-2 text-left">Nom et Prénom(s)</th>
                <th className="border border-slate-600 px-2 py-2 text-left">Classe</th>
                <th className="border border-slate-600 px-2 py-2 text-left">Série</th>

                {feeCodes.map((code) => (
                  <th key={code} className="border border-slate-600 px-2 py-2 text-center">
                    {code}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {displayedRows.map((s, index) => (
                <tr key={s.id} className={index % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                  <td className="border border-slate-300 px-2 py-1 font-semibold text-blue-700">
                    {s.matricule}
                  </td>

                  <td className="border border-slate-300 px-2 py-1">
                    {formatDate(s.dateInscription)}
                  </td>

                  <td className="border border-slate-300 px-2 py-1 font-medium">
                    {s.fullName}
                  </td>

                  <td className="border border-slate-300 px-2 py-1">{s.classe}</td>
                  <td className="border border-slate-300 px-2 py-1">{s.serie}</td>

                  {feeCodes.map((code) => {
                    const paid = isRowCodePaid(s, code);

                    return (
                      <td
                        key={code}
                        className={`border border-slate-300 text-center ${
                          paid ? "bg-[#18d500]" : "bg-[#fff176]"
                        }`}
                        title={`${code} : ${paid ? "PAYÉ" : "NON PAYÉ"}`}
                      >
                        {paid ? (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black leading-none text-[#18d500]">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#e53935] text-[10px] font-black leading-none text-white">
                            !
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {!loading && displayedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={feeCodes.length + 5}
                    className="border border-slate-300 py-6 text-center text-slate-500"
                  >
                    Aucun état de paiement trouvé
                  </td>
                </tr>
              )}

              <tr className="bg-slate-200 font-bold text-blue-700">
                <td colSpan={5} className="border border-slate-300 px-2 py-2 text-right">
                  Total non payé
                </td>

                {feeCodes.map((code) => (
                  <td key={code} className="border border-slate-300 text-center">
                    {displayedRows.filter((r) => !isRowCodePaid(r, code)).length}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
