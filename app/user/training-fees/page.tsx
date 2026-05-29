"use client";

import { useEffect, useMemo, useState } from "react";

type Serie = { id: number; name: string };

type ClassRoom = {
  id: number;
  name: string;
  levelId: number;
  schoolYearName?: string;
  series?: Serie[];
};

type Level = {
  id: number;
  name: string;
  schoolYearName?: string;
  classes?: ClassRoom[];
};

type AcademicsData = {
  year: string;
  levels: Level[];
};

type FeeTariff = {
  id?: number;
  libelle?: string;
  title?: string;
  name?: string;
  code?: string;
  montant?: number;
  amount?: number;
};

type FeeModel = {
  id: number;
  title?: string;
  name?: string;
  libelle?: string;
  tariffs?: FeeTariff[];
  rows?: FeeTariff[];
  details?: FeeTariff[];
};

type TrainingFee = {
  id: number;
  schoolYearName?: string;
  site?: string;
  levelId?: number;
  classId?: number;
  classRoomId?: number;
  feeModelId?: number;
  level?: { id: number; name: string };
  class?: { id: number; name: string };
  classRoom?: { id: number; name: string };
  classe?: string;
  feeModel?: { id: number; title?: string; name?: string; libelle?: string };
  rows?: FeeTariff[];
  details?: FeeTariff[];
  libelle?: string;
  code?: string;
  montant?: number;
};

type FeeRow = {
  libelle: string;
  code: string;
  montant: string;
};

type ClassGroup = {
  key: string;
  classId: number | null;
  className: string;
  levelName: string;
  levelId: number | null;
  year: string;
  fees: TrainingFee[];
};

function normalizeArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.models)) return value.models;
  if (Array.isArray(value?.feeModels)) return value.feeModels;
  if (Array.isArray(value?.trainingFees)) return value.trainingFees;
  if (Array.isArray(value?.fees)) return value.fees;
  return [];
}

function formatAmount(value: number | string | undefined | null) {
  const onlyDigits = String(value ?? "").replace(/\D/g, "");
  if (!onlyDigits) return "";
  return onlyDigits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function amountToNumber(value: string) {
  return Number(String(value || "").replace(/\s/g, "")) || 0;
}

function modelTitle(model?: FeeModel | TrainingFee["feeModel"]) {
  return model?.title || model?.name || model?.libelle || "";
}

function tariffLabel(row: FeeTariff) {
  return row.libelle || row.title || row.name || "Frais";
}

function feeLibelle(fee: TrainingFee) {
  const row = getFeeRows(fee)[0];
  return fee.libelle || row?.libelle || row?.title || row?.name || "";
}

function feeCode(fee: TrainingFee) {
  const row = getFeeRows(fee)[0];
  return fee.code || row?.code || "";
}

function feeMontant(fee: TrainingFee) {
  const row = getFeeRows(fee)[0];
  return Number(fee.montant ?? row?.montant ?? row?.amount ?? 0);
}

function getFeeRows(fee: TrainingFee): FeeTariff[] {
  const rows = normalizeArray(fee.rows);
  const details = normalizeArray(fee.details);

  if (rows.length) return rows as FeeTariff[];
  if (details.length) return details as FeeTariff[];

  if (fee.libelle || fee.code || fee.montant !== undefined) {
    return [
      {
        libelle: fee.libelle || "Frais",
        code: fee.code || "",
        montant: fee.montant || 0,
      },
    ];
  }

  return [];
}

async function fetchJsonWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await res.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const message =
        data?.error ||
        data?.message ||
        `Erreur serveur (${res.status}). Vérifiez la route API.`;
      throw new Error(message);
    }

    return data;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Connexion trop lente ou bloquée. Réessayez.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}


function stableInsertionOrderValue(item: any, fallback = 0) {
  const explicit =
    item?.ordre ??
    item?.order ??
    item?.position ??
    item?.rang ??
    item?.rank ??
    item?.sortOrder ??
    item?.displayOrder;

  if (explicit !== undefined && explicit !== null && explicit !== "") {
    const n = Number(explicit);
    if (Number.isFinite(n)) return n;
  }

  const createdAt = item?.createdAt || item?.created_at;
  if (createdAt) {
    const t = new Date(createdAt).getTime();
    if (Number.isFinite(t)) return t;
  }

  const id = Number(item?.id);
  return Number.isFinite(id) ? id : fallback;
}

function sortByInsertionOrder<T>(items: T[] | undefined | null): T[] {
  const list = Array.isArray(items) ? items : [];

  return [...list].sort((a: any, b: any) => {
    const diff = stableInsertionOrderValue(a) - stableInsertionOrderValue(b);
    if (diff !== 0) return diff;

    return Number(a?.id || 0) - Number(b?.id || 0);
  });
}


export default function TrainingFeesPage() {
  const [academics, setAcademics] = useState<AcademicsData>({
    year: "",
    levels: [],
  });
  const [feeModels, setFeeModels] = useState<FeeModel[]>([]);
  const [trainingFees, setTrainingFees] = useState<TrainingFee[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const [selectedSite, setSelectedSite] = useState("Strelitzia School");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedClasse, setSelectedClasse] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [rows, setRows] = useState<FeeRow[]>([]);

  const [editingFee, setEditingFee] = useState<TrainingFee | null>(null);
  const [editForm, setEditForm] = useState<FeeRow>({
    libelle: "",
    code: "",
    montant: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingFeeId, setDeletingFeeId] = useState<number | null>(null);

  const [filterLevel, setFilterLevel] = useState("");
  const [filterClass, setFilterClass] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      setMessage(null);

      const [academicsData, modelsData, feesData] = await Promise.all([
        fetchJsonWithTimeout("/api/academics"),
        fetchJsonWithTimeout("/api/fee-models"),
        fetchJsonWithTimeout("/api/training-fees"),
      ]);

      setAcademics({
        year: academicsData?.year || "",
        levels: normalizeArray(academicsData?.levels) as Level[],
      });

      setFeeModels(normalizeArray(modelsData) as FeeModel[]);
      setTrainingFees(normalizeArray(feesData) as TrainingFee[]);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Impossible de charger les données.",
      });
    } finally {
      setLoading(false);
    }
  }

  const allClasses = useMemo(() => {
    return academics.levels.flatMap((level) =>
      (level.classes || []).map((classe) => ({
        ...classe,
        levelName: level.name,
        levelId: level.id,
      }))
    );
  }, [academics.levels]);

  const classesForSelectedLevel = useMemo(() => {
    const level = academics.levels.find((item) => String(item.id) === selectedLevel);
    return level?.classes || [];
  }, [academics.levels, selectedLevel]);

  const classesForFilterLevel = useMemo(() => {
    if (!filterLevel) return allClasses;
    return allClasses.filter((item) => String(item.levelId) === filterLevel);
  }, [allClasses, filterLevel]);

  const selectedClassObject = useMemo(() => {
    return allClasses.find((item) => String(item.id) === selectedClasse);
  }, [allClasses, selectedClasse]);

  const classGroups = useMemo<ClassGroup[]>(() => {
    const map = new Map<string, ClassGroup>();

    for (const fee of trainingFees) {
      const classId = fee.classId || fee.classRoomId || fee.class?.id || fee.classRoom?.id || null;
      const className =
        fee.class?.name ||
        fee.classRoom?.name ||
        fee.classe ||
        allClasses.find((item) => item.id === classId)?.name ||
        "Classe non définie";

      const levelId =
        fee.levelId ||
        fee.level?.id ||
        allClasses.find((item) => item.id === classId)?.levelId ||
        null;

      const levelName =
        fee.level?.name ||
        allClasses.find((item) => item.id === classId)?.levelName ||
        "Niveau non défini";

      const key = classId ? `id-${classId}` : `name-${className}`;
      const year = fee.schoolYearName || academics.year || "-";

      if (!map.has(key)) {
        map.set(key, {
          key,
          classId,
          className,
          levelName,
          levelId,
          year,
          fees: [],
        });
      }

      map.get(key)!.fees.push(fee);
    }

    return Array.from(map.values())
      .filter((group) => {
        const levelOk = filterLevel ? String(group.levelId) === filterLevel : true;
        const classOk = filterClass
          ? group.classId
            ? String(group.classId) === filterClass
            : group.className === filterClass
          : true;

        return levelOk && classOk;
      })
      .sort((a, b) => a.levelName.localeCompare(b.levelName) || a.className.localeCompare(b.className));
  }, [trainingFees, allClasses, academics.year, filterLevel, filterClass]);

  const totalModels = trainingFees.length;
  const totalClassesWithFees = classGroups.length;
  const totalAmount = useMemo(() => {
    return trainingFees.reduce((sum, fee) => {
      const rows = getFeeRows(fee);
      const local = rows.reduce((s, row) => s + Number(row.montant || row.amount || 0), 0);
      return sum + local;
    }, 0);
  }, [trainingFees]);

  function openAddModal() {
    setOpen(true);
    setMessage(null);
    setSelectedSite("Strelitzia School");
    setSelectedLevel("");
    setSelectedClasse("");
    setSelectedModel("");
    setRows([]);
  }

  function selectLevel(levelId: string) {
    setSelectedLevel(levelId);
    setSelectedClasse("");
    setSelectedModel("");
    setRows([]);
  }

  async function selectModel(modelId: string) {
    setSelectedModel(modelId);
    setRows([]);

    if (!modelId) return;

    try {
      const data = await fetchJsonWithTimeout(`/api/fee-models/${modelId}`);
      const modelRows = normalizeArray(data?.tariffs || data?.rows || data?.details);

      setRows(
        modelRows.map((item: FeeTariff) => ({
          libelle: tariffLabel(item),
          code: item.code || "",
          montant: formatAmount(item.montant || item.amount || 0),
        }))
      );
    } catch (error: any) {
      const fallback = feeModels.find((model) => String(model.id) === modelId);
      const fallbackRows = normalizeArray(
        fallback?.tariffs || fallback?.rows || fallback?.details
      );

      setRows(
        fallbackRows.map((item: FeeTariff) => ({
          libelle: tariffLabel(item),
          code: item.code || "",
          montant: formatAmount(item.montant || item.amount || 0),
        }))
      );

      if (!fallbackRows.length) {
        setMessage({
          type: "error",
          text: error?.message || "Impossible de charger ce modèle de frais.",
        });
      }
    }
  }

  function updateRow(index: number, field: keyof FeeRow, value: string) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, [field]: field === "montant" ? formatAmount(value) : value }
          : row
      )
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { libelle: "", code: "", montant: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveTrainingFee() {
    if (saving) return;

    const validRows = rows.filter(
      (row) => row.libelle.trim() || row.code.trim() || row.montant.trim()
    );

    if (!academics.year || !selectedLevel || !selectedClasse || !selectedModel) {
      setMessage({
        type: "error",
        text: "Données incomplètes : choisissez niveau, classe et modèle.",
      });
      return;
    }

    if (!validRows.length) {
      setMessage({
        type: "error",
        text: "Ajoutez au moins une ligne de frais.",
      });
      return;
    }

    for (const row of validRows) {
      if (!row.libelle.trim() || !row.code.trim() || !row.montant.trim()) {
        setMessage({
          type: "error",
          text: "Chaque ligne doit avoir Intitulé, Code et Montant.",
        });
        return;
      }
    }

    try {
      setSaving(true);
      setMessage(null);

      await fetchJsonWithTimeout(
        "/api/training-fees",
        {
          method: "POST",
          body: JSON.stringify({
            schoolYearName: academics.year,
            site: selectedSite,
            levelId: Number(selectedLevel),
            classId: Number(selectedClasse),
            classRoomId: Number(selectedClasse),
            classe: selectedClassObject?.name || "",
            feeModelId: Number(selectedModel),
            rows: validRows.map((row) => ({
              libelle: row.libelle.trim(),
              code: row.code.trim(),
              montant: amountToNumber(row.montant),
            })),
          }),
        },
        20000
      );

      setMessage({
        type: "success",
        text: "Frais enregistrés avec succès.",
      });
      setOpen(false);
      await loadAll();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Erreur pendant l'enregistrement.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteClassFees(group: ClassGroup) {
    if (deletingKey) return;

    const confirmed = window.confirm(
      `Supprimer tous les modèles de frais de la classe "${group.className}" ?`
    );
    if (!confirmed) return;

    try {
      setDeletingKey(group.key);
      setMessage(null);

      const query = group.classId
        ? `classId=${encodeURIComponent(group.classId)}`
        : `classe=${encodeURIComponent(group.className)}`;

      try {
        await fetchJsonWithTimeout(`/api/training-fees?${query}`, { method: "DELETE" }, 20000);
      } catch {
        await Promise.all(
          sortByInsertionOrder(group.fees).map((fee) =>
            fetchJsonWithTimeout(`/api/training-fees/${fee.id}`, { method: "DELETE" }, 20000)
          )
        );
      }

      setMessage({
        type: "success",
        text: `Les frais de la classe ${group.className} ont été supprimés.`,
      });
      await loadAll();
    } catch (error: any) {
      setMessage({
        type: "error",
        text:
          error?.message ||
          "Suppression impossible. Vérifiez que la route DELETE existe dans /api/training-fees.",
      });
    } finally {
      setDeletingKey(null);
    }
  }

  function openEditFee(fee: TrainingFee) {
    setEditingFee(fee);
    setEditForm({
      libelle: feeLibelle(fee),
      code: feeCode(fee),
      montant: formatAmount(feeMontant(fee)),
    });
    setMessage(null);
  }

  function updateEditForm(field: keyof FeeRow, value: string) {
    setEditForm((prev) => ({
      ...prev,
      [field]: field === "montant" ? formatAmount(value) : value,
    }));
  }

  async function saveEditedFee() {
    if (!editingFee || savingEdit) return;

    if (!editForm.libelle.trim() || !editForm.code.trim() || !editForm.montant.trim()) {
      setMessage({
        type: "error",
        text: "Libellé, Code et Montant sont obligatoires.",
      });
      return;
    }

    try {
      setSavingEdit(true);
      setMessage(null);

      await fetchJsonWithTimeout(
        "/api/training-fees",
        {
          method: "PATCH",
          body: JSON.stringify({
            id: editingFee.id,
            libelle: editForm.libelle.trim(),
            code: editForm.code.trim(),
            montant: amountToNumber(editForm.montant),
          }),
        },
        20000
      );

      setMessage({
        type: "success",
        text: "Frais modifié avec succès.",
      });
      setEditingFee(null);
      await loadAll();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Modification impossible.",
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteFee(fee: TrainingFee) {
    if (deletingFeeId) return;

    const confirmed = window.confirm(
      `Supprimer "${feeLibelle(fee) || "ce frais"}" ?`
    );
    if (!confirmed) return;

    try {
      setDeletingFeeId(fee.id);
      setMessage(null);

      await fetchJsonWithTimeout(
        `/api/training-fees?id=${encodeURIComponent(fee.id)}`,
        { method: "DELETE" },
        20000
      );

      setMessage({
        type: "success",
        text: "Frais supprimé avec succès.",
      });
      await loadAll();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Suppression impossible.",
      });
    } finally {
      setDeletingFeeId(null);
    }
  }

  function classTotal(group: ClassGroup) {
    return group.fees.reduce((sum, fee) => {
      return (
        sum +
        getFeeRows(fee).reduce(
          (local, row) => local + Number(row.montant || row.amount || 0),
          0
        )
      );
    }, 0);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-cyan-50 p-3 text-slate-900 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-xl shadow-indigo-100/60 backdrop-blur">
          <div className="bg-gradient-to-r from-indigo-700 via-blue-600 to-cyan-500 p-5 text-white md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-white/25">
                  Gestion scolaire
                </div>
                <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                  Frais de formation
                </h1>
                <p className="mt-1 text-sm text-indigo-50">
                  Frais attachés par niveau et par classe pour les paiements étudiants.
                </p>
              </div>

              <button
                onClick={openAddModal}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg shadow-indigo-900/20 transition hover:-translate-y-0.5 hover:bg-indigo-50 active:translate-y-0"
              >
                + Ajouter des frais
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3 md:p-5">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                Année active
              </p>
              <p className="mt-1 text-xl font-black text-indigo-950">
                {academics.year || "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                Classes configurées
              </p>
              <p className="mt-1 text-xl font-black text-emerald-950">
                {totalClassesWithFees}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-600">
                Total prévisionnel
              </p>
              <p className="mt-1 text-xl font-black text-cyan-950">
                {formatAmount(totalAmount)} Ar
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-4 rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-lg shadow-slate-200/70">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <select
              value={filterLevel}
              onChange={(e) => {
                setFilterLevel(e.target.value);
                setFilterClass("");
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">Tous les niveaux</option>
              {academics.levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>

            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">Toutes les classes</option>
              {classesForFilterLevel.map((classe) => (
                <option key={classe.id} value={classe.id}>
                  {classe.name}
                </option>
              ))}
            </select>

            <button
              onClick={loadAll}
              disabled={loading}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? "Chargement..." : "Actualiser"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-white/80 bg-white/90 p-10 text-center shadow-lg">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            <p className="font-bold text-slate-600">Chargement des frais...</p>
          </div>
        ) : classGroups.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-indigo-200 bg-white/80 p-10 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-3xl">
              🧾
            </div>
            <h2 className="text-lg font-black text-slate-900">Aucun frais enregistré</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ajoutez des frais puis ils apparaîtront automatiquement par classe.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classGroups.map((group) => {
              const isExpanded = expandedKey === group.key;
              const deleting = deletingKey === group.key;
              const total = classTotal(group);

              return (
                <div
                  key={group.key}
                  className="overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-xl shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-700 p-4 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                          {group.levelName}
                        </p>
                        <h3 className="mt-1 text-xl font-black">{group.className}</h3>
                        <p className="mt-1 text-xs text-indigo-100">{group.year}</p>
                      </div>
                      <div className="rounded-2xl bg-white/15 px-3 py-2 text-right ring-1 ring-white/20">
                        <p className="text-lg font-black">{group.fees.length}</p>
                        <p className="text-[10px] font-bold uppercase text-indigo-100">frais</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-cyan-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                        Montant total classe
                      </p>
                      <p className="text-2xl font-black text-indigo-950">
                        {formatAmount(total)} Ar
                      </p>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="grid grid-cols-[1.3fr_0.7fr_0.9fr_1fr] bg-gradient-to-r from-indigo-50 to-cyan-50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-slate-600">
                        <span>Libellé</span>
                        <span>Code</span>
                        <span className="text-right">Montant</span>
                        <span className="text-right">Action</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {group.fees
                          .slice(0, isExpanded ? group.fees.length : 4)
                          .map((fee) => {
                            const deletingLine = deletingFeeId === fee.id;
                            return (
                              <div
                                key={fee.id}
                                className="grid grid-cols-[1.3fr_0.7fr_0.9fr_1fr] items-center gap-2 px-3 py-3 text-xs transition hover:bg-slate-50"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-black text-slate-900">
                                    {feeLibelle(fee) || "—"}
                                  </p>
                                </div>

                                <p className="font-bold text-indigo-700">
                                  {feeCode(fee) || "—"}
                                </p>

                                <p className="text-right font-black text-emerald-700">
                                  {formatAmount(feeMontant(fee))} Ar
                                </p>

                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => openEditFee(fee)}
                                    disabled={!!deletingFeeId}
                                    className="rounded-xl bg-amber-50 px-2 py-1.5 text-[11px] font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    onClick={() => deleteFee(fee)}
                                    disabled={!!deletingFeeId}
                                    className="rounded-xl bg-rose-50 px-2 py-1.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                  >
                                    {deletingLine ? "..." : "Suppr."}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setExpandedKey(isExpanded ? null : group.key)}
                        className="rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
                      >
                        {isExpanded ? "Réduire" : "Voir détails"}
                      </button>

                      <button
                        onClick={() => deleteClassFees(group)}
                        disabled={!!deletingKey}
                        className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleting ? "Suppression..." : "Supprimer classe"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-700 via-blue-600 to-cyan-500 p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                    Nouveau paramétrage
                  </p>
                  <h2 className="mt-1 text-xl font-black">Ajouter des frais</h2>
                  <p className="mt-1 text-xs text-indigo-50">
                    Les lignes seront liées à la classe sélectionnée.
                  </p>
                </div>
                <button
                  onClick={() => !saving && setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold transition hover:bg-white/25"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="max-h-[76vh] overflow-y-auto p-4 md:p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Année scolaire
                  </label>
                  <input
                    value={academics.year}
                    readOnly
                    className="h-11 w-full rounded-2xl border border-indigo-100 bg-indigo-50 px-4 text-sm font-black text-indigo-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Site
                  </label>
                  <input
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Niveau d'étude
                  </label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => selectLevel(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="">Choisissez un niveau</option>
                    {academics.levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Classe
                  </label>
                  <select
                    value={selectedClasse}
                    onChange={(e) => {
                      setSelectedClasse(e.target.value);
                      setSelectedModel("");
                      setRows([]);
                    }}
                    disabled={!selectedLevel}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {selectedLevel ? "Choisissez une classe" : "Sélectionnez d'abord un niveau"}
                    </option>
                    {classesForSelectedLevel.map((classe) => (
                      <option key={classe.id} value={classe.id}>
                        {classe.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Type de modèle
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => selectModel(e.target.value)}
                    disabled={!selectedClasse}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {selectedClasse
                        ? "Choisissez un type de modèle"
                        : "Sélectionnez d'abord une classe"}
                    </option>
                    {feeModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {modelTitle(model)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
                  <h3 className="text-sm font-black">Détail des frais</h3>
                  <button
                    onClick={addRow}
                    className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-black transition hover:bg-white/25"
                  >
                    + Ligne
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <div className="p-6 text-center text-sm font-semibold text-slate-500">
                      Sélectionnez un modèle ou ajoutez une ligne.
                    </div>
                  ) : (
                    rows.map((row, index) => (
                      <div key={index} className="grid gap-2 p-3 md:grid-cols-[1fr_130px_150px_44px]">
                        <input
                          value={row.libelle}
                          onChange={(e) => updateRow(index, "libelle", e.target.value)}
                          placeholder="Intitulé"
                          className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                        />
                        <input
                          value={row.code}
                          onChange={(e) => updateRow(index, "code", e.target.value)}
                          placeholder="Code"
                          className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                        />
                        <input
                          value={row.montant}
                          onChange={(e) => updateRow(index, "montant", e.target.value)}
                          placeholder="Montant"
                          className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-right text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                        />
                        <button
                          onClick={() => removeRow(index)}
                          className="h-10 rounded-2xl bg-rose-50 text-sm font-black text-rose-600 transition hover:bg-rose-100"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end">
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Fermer
              </button>
              <button
                onClick={saveTrainingFee}
                disabled={saving}
                className="rounded-2xl bg-gradient-to-r from-indigo-700 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
      {editingFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-50">
                    Modification
                  </p>
                  <h2 className="mt-1 text-xl font-black">Modifier ce frais</h2>
                </div>
                <button
                  onClick={() => !savingEdit && setEditingFee(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold transition hover:bg-white/25"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-3 p-5">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Libellé
                </label>
                <input
                  value={editForm.libelle}
                  onChange={(e) => updateEditForm("libelle", e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Code
                </label>
                <input
                  value={editForm.code}
                  onChange={(e) => updateEditForm("code", e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Montant
                </label>
                <input
                  value={editForm.montant}
                  onChange={(e) => updateEditForm("montant", e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-right text-sm font-black outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end">
              <button
                onClick={() => setEditingFee(null)}
                disabled={savingEdit}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={saveEditedFee}
                disabled={savingEdit}
                className="rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingEdit ? "Modification..." : "Enregistrer modification"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
