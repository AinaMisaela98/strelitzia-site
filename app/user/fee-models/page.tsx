"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type FeeSpecialTariff = {
  id: number;
  feeTariffId: number;
  name: string;
  amount: number;
};

type SchoolYear = {
  id: number;
  name: string;
  active: boolean;
};

type FeeTariff = {
  id: number;
  feeModelId: number;
  libelle: string;
  code: string;
  montant: number;
  specials: FeeSpecialTariff[];
};

type FeeModel = {
  id: number;
  title: string;
  classe: string;
  schoolYearName: string;
  tariffs: FeeTariff[];
};

type DraftRow = {
  tempId: string;
  libelle: string;
  code: string;
  montant: string;
  specials: Record<string, string>;
};

export default function FeeModelsPage() {
  const router = useRouter();
  const pathname = usePathname();

  const sidebarLinks = [
  {
    label: "Année scolaire",
    href: "/user/school-years",
  },

  {
    label: "Liste des niveaux",
    href: "/user/academics",
  },

  {
    label: "Modèles de frais",
    href: "/user/fee-models",
  },

  {
    label: "Frais de formation",
    href: "/user/training-fees",
  },

  {
    label: "Activités scolaires",
    href: "/user/school-activities",
  },
];

  const [models, setModels] = useState<FeeModel[]>([]);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<FeeModel | null>(null);

  const [title, setTitle] = useState("");
  const [classe, setClasse] = useState("GENERAL");

  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [schoolYearName, setSchoolYearName] = useState("");

  const [specialColumns, setSpecialColumns] = useState<string[]>([]);
  const [newSpecialColumn, setNewSpecialColumn] = useState("");

  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [cellSpecialInputs, setCellSpecialInputs] = useState<Record<string, string>>({});

  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return models;

    return models.filter((model) =>
      `${model.title} ${model.schoolYearName}`.toLowerCase().includes(q)
    );
  }, [models, search]);

  useEffect(() => {
    loadModels();
    loadSchoolYears();
  }, []);

  function showSuccess(text: string) {
    setSuccessMessage(text);
    setTimeout(() => setSuccessMessage(""), 3500);
  }

  function cleanAmount(value: string | number) {
    return String(value ?? "").replace(/\D/g, "");
  }

  function formatAmountInput(value: string | number) {
    const cleaned = cleanAmount(value);
    if (!cleaned) return "";
    return new Intl.NumberFormat("fr-FR").format(Number(cleaned));
  }

  function amountToNumber(value: string | number) {
    const cleaned = cleanAmount(value);
    return cleaned ? Number(cleaned) : 0;
  }

  function formatMoney(value: number | string) {
    return formatAmountInput(value);
  }

  function createEmptyDraftRow(): DraftRow {
    return {
      tempId: `${Date.now()}-${Math.random()}`,
      libelle: "",
      code: "",
      montant: "",
      specials: {},
    };
  }

  function extractSpecialColumns(model: FeeModel) {
    const names = model.tariffs.flatMap((tariff) =>
      tariff.specials.map((special) => special.name)
    );

    return Array.from(new Set(names));
  }

  function specialColumnsStorageKey(modelId: number) {
    return `fee-model-special-columns-${modelId}`;
  }

  function loadPersistedSpecialColumns(model: FeeModel) {
    const fromDb = extractSpecialColumns(model);

    try {
      const raw = localStorage.getItem(specialColumnsStorageKey(model.id));
      const saved = raw ? JSON.parse(raw) : [];

      if (Array.isArray(saved)) {
        return Array.from(
          new Set([
            ...fromDb,
            ...saved.filter((name) => typeof name === "string"),
          ])
        );
      }
    } catch (error) {
      console.error("Erreur lecture colonnes tarifs:", error);
    }

    return fromDb;
  }

  function persistSpecialColumns(modelId: number, columns: string[]) {
    try {
      localStorage.setItem(
        specialColumnsStorageKey(modelId),
        JSON.stringify(Array.from(new Set(columns)))
      );
    } catch (error) {
      console.error("Erreur sauvegarde colonnes tarifs:", error);
    }
  }

  async function safeJson(res: Response) {
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return res.json();
    }

    const text = await res.text();
    throw new Error(
      text.startsWith("<!DOCTYPE")
        ? "API introuvable ou erreur HTML retournée. Vérifiez les routes API."
        : text || "Réponse API invalide."
    );
  }

  async function loadSchoolYears() {
    try {
      const res = await fetch("/api/school-years", { cache: "no-store" });
      const data = await safeJson(res);

      if (Array.isArray(data)) {
        setSchoolYears(data);

        const active = data.find((year: SchoolYear) => year.active);
        setSchoolYearName(active?.name || data[0]?.name || "");
      }
    } catch (error) {
      console.error(error);
      setMessage("Erreur chargement années scolaires.");
    }
  }

  async function loadModels() {
    try {
      const res = await fetch(`/api/fee-models?q=${encodeURIComponent(search)}`);
      const data = await safeJson(res);

      setModels(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Erreur chargement modèles de frais.");
    }
  }

  function resetCreateForm() {
    const active = schoolYears.find((year) => year.active);

    setTitle("");
    setClasse("GENERAL");
    setSchoolYearName(active?.name || schoolYears[0]?.name || "");
    setMessage("");
  }

  async function createModel() {
    setMessage("");

    try {
      const res = await fetch("/api/fee-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, classe: "GENERAL", schoolYearName }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setMessage(data.message || "Erreur création modèle.");
        return;
      }

      resetCreateForm();
      setCreateOpen(false);
      await loadModels();

      showSuccess("Modèle de frais créé avec succès.");
    } catch (error: any) {
      console.error("Erreur création modèle frais:", error);
      setMessage(error?.message || "Erreur création modèle.");
    }
  }

  async function openModel(model: FeeModel) {
    setMessage("");

    try {
      const res = await fetch(`/api/fee-models/${model.id}`);
      const data = await safeJson(res);

      if (!res.ok) {
        setMessage(data.message || "Erreur ouverture modèle.");
        return;
      }

      setSelectedModel(data);
      setTitle(data.title);
      setClasse(data.classe || "GENERAL");
      setSchoolYearName(data.schoolYearName);
      setSpecialColumns(loadPersistedSpecialColumns(data));
      setCellSpecialInputs({});
      setDraftRows([]);
      setEditOpen(true);
    } catch (error: any) {
      console.error("Erreur ouverture modèle:", error);
      setMessage(error?.message || "Erreur ouverture modèle.");
    }
  }

  async function refreshSelectedModel() {
    if (!selectedModel) return;

    const res = await fetch(`/api/fee-models/${selectedModel.id}`);
    const data = await safeJson(res);

    if (res.ok) {
      setSelectedModel(data);
      setSpecialColumns((previous) => {
        const merged = Array.from(
          new Set([...previous, ...loadPersistedSpecialColumns(data)])
        );

        persistSpecialColumns(data.id, merged);

        return merged;
      });
    }

    await loadModels();
  }

  async function saveAll() {
    if (!selectedModel) return;

    try {
      setMessage("");
      persistSpecialColumns(selectedModel.id, specialColumns);

      const updateRes = await fetch(`/api/fee-models/${selectedModel.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          classe: "GENERAL",
          schoolYearName,
        }),
      });

      const updated = await safeJson(updateRes);

      if (!updateRes.ok) {
        setMessage(updated.message || "Erreur modification modèle.");
        return;
      }

     const rowsToSave = draftRows.filter(
        (row) =>
          row.libelle.trim() ||
          row.code.trim() ||
          row.montant.trim() ||
          Object.values(row.specials).some((v) => v.trim())
      );

      for (const row of rowsToSave) {
        if (!row.libelle.trim() || !row.code.trim() || !row.montant.trim()) {
          setMessage("Chaque ligne doit avoir Libellé, Code et Montant.");
          return;
        }

        const tariffRes = await fetch("/api/fee-tariffs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feeModelId: selectedModel.id,
            libelle: row.libelle.trim(),
            code: row.code.trim(),
            montant: amountToNumber(row.montant),
          }),
        });

        const tariff = await safeJson(tariffRes);

        if (!tariffRes.ok) {
          setMessage(tariff.message || "Erreur ajout tarif.");
          return;
        }

        for (const columnName of specialColumns) {
          const amount = row.specials[columnName];

          if (amount && amount.trim()) {
            const specialRes = await fetch("/api/fee-special-tariffs", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                feeTariffId: tariff.id,
                name: columnName,
                amount: amountToNumber(amount),
              }),
            });

            const specialData = await safeJson(specialRes);

            if (!specialRes.ok) {
              setMessage(specialData.message || "Erreur tarif spécial.");
              return;
            }
          }
        }
      }

      setDraftRows([]);

      await refreshSelectedModel();
      await loadModels();

      showSuccess("Enregistrement effectué avec succès.");
    } catch (error: any) {
      console.error("Erreur enregistrement modèle frais:", error);
      setMessage(error?.message || "Erreur lors de l'enregistrement.");
    }
  }

  async function deleteModel(id: number) {
    if (!confirm("Supprimer ce modèle de frais ?")) return;

    await fetch(`/api/fee-models/${id}`, { method: "DELETE" });

    if (selectedModel?.id === id) {
      setSelectedModel(null);
      setEditOpen(false);
    }

    await loadModels();
    showSuccess("Modèle supprimé.");
  }

  function addSpecialColumn() {
    const name = newSpecialColumn.trim();

    if (!name) {
      setMessage("Entrez le nom du tarif à ajouter.");
      return;
    }

    if (specialColumns.some((column) => column.toLowerCase() === name.toLowerCase())) {
      setMessage("Cette colonne existe déjà.");
      return;
    }

    setSpecialColumns((previous) => {
      const next = [...previous, name];

      if (selectedModel) {
        persistSpecialColumns(selectedModel.id, next);
      }

      return next;
    });

    setNewSpecialColumn("");
    setMessage("");
    showSuccess(`Tarif "${name}" ajouté.`);
  }

  function removeSpecialColumn(name: string) {
    if (!confirm(`Supprimer la colonne "${name}" ?`)) return;

    setSpecialColumns((previous) => {
      const next = previous.filter((column) => column !== name);

      if (selectedModel) {
        persistSpecialColumns(selectedModel.id, next);
      }

      return next;
    });

    setDraftRows((previous) =>
      previous.map((row) => {
        const specials = { ...row.specials };
        delete specials[name];

        return { ...row, specials };
      })
    );

    showSuccess(`Tarif "${name}" supprimé.`);
  }


  function clearDraftRow(tempId: string) {
    setDraftRows((previous) =>
      previous.map((row) =>
        row.tempId === tempId ? createEmptyDraftRow() : row
      )
    );
  }

  function addDraftRow() {
    setDraftRows((previous) => [...previous, createEmptyDraftRow()]);
  }

  function removeDraftRow(tempId: string) {
    setDraftRows((previous) => {
      if (previous.length <= 1) return previous;
      return previous.filter((row) => row.tempId !== tempId);
    });
  }

  function updateDraftRow(
    tempId: string,
    field: "libelle" | "code" | "montant",
    value: string
  ) {
    setDraftRows((previous) =>
      previous.map((row) =>
        row.tempId === tempId ? { ...row, [field]: value } : row
      )
    );
  }

  function updateDraftSpecial(tempId: string, column: string, value: string) {
    setDraftRows((previous) =>
      previous.map((row) =>
        row.tempId === tempId
          ? {
              ...row,
              specials: {
                ...row.specials,
                [column]: formatAmountInput(value),
              },
            }
          : row
      )
    );
  }

  function updateCellInput(tariffId: number, columnName: string, value: string) {
    setCellSpecialInputs((previous) => ({
      ...previous,
      [`${tariffId}-${columnName}`]: formatAmountInput(value),
    }));
  }

  async function addSpecialAmountToTariff(tariffId: number, columnName: string) {
    const key = `${tariffId}-${columnName}`;
    const amount = cellSpecialInputs[key];

    if (!amount || !amount.trim()) {
      setMessage("Montant tarif spécial obligatoire.");
      return;
    }

    try {
      const res = await fetch("/api/fee-special-tariffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeTariffId: tariffId,
          name: columnName,
          amount: amountToNumber(amount),
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setMessage(data.message || "Erreur ajout tarif spécial.");
        return;
      }

      setCellSpecialInputs((previous) => {
        const copy = { ...previous };
        delete copy[key];
        return copy;
      });

      await refreshSelectedModel();
      showSuccess("Tarif ajouté.");
    } catch (error: any) {
      console.error("Erreur ajout tarif spécial:", error);
      setMessage(error?.message || "Erreur ajout tarif spécial.");
    }
  }

  async function deleteTariff(id: number) {
    if (!confirm("Supprimer ce tarif ?")) return;

    await fetch(`/api/fee-tariffs/${id}`, { method: "DELETE" });
    await refreshSelectedModel();
    showSuccess("Tarif supprimé.");
  }

  async function deleteSpecial(id: number) {
    if (!confirm("Supprimer ce montant spécial ?")) return;

    await fetch(`/api/fee-special-tariffs/${id}`, { method: "DELETE" });
    await refreshSelectedModel();
    showSuccess("Montant supprimé.");
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[12px] text-slate-800">
      {successMessage && (
        <div className="fixed right-4 top-4 z-[100] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 shadow-2xl">
          ✅ {successMessage}
        </div>
      )}

      <div className="flex min-h-screen">
        <aside className="hidden w-[205px] bg-[#3f3f3f] text-white md:block">
          <div className="flex h-[70px] items-center border-b bg-white px-3">
            <div className="text-lg font-black text-green-700">STRELITZIA</div>
          </div>

          <div className="bg-[#303030] px-3 py-3 font-bold">⚙ Paramètres</div>

          <nav className="text-[12px]">
            {sidebarLinks.map((item) => {
              const active = pathname === item.href;

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`block w-full px-5 py-2 text-left hover:bg-[#b7b7b7] ${
                    active ? "bg-[#a8a8a8]" : ""
                  }`}
                >
                  - {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="flex-1 p-2 md:p-3 overflow-hidden">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-[16px] font-semibold">
              Modèles de frais ({models.length})
            </h1>

            <div className="flex gap-2">
              <button
                onClick={loadModels}
                className="rounded bg-cyan-600 px-3 py-2 text-xs font-bold text-white"
              >
                ⟳ Actualiser
              </button>

              <button
                onClick={() => {
                  resetCreateForm();
                  setCreateOpen(true);
                }}
                className="rounded border border-slate-400 bg-white px-2.5 py-1.5 text-[11px] font-bold"
              >
                ✚ Ajouter
              </button>
            </div>
          </div>

          <div className="mb-2 flex justify-end">
            <div>
              <label className="mb-1 block text-xs">Recherche</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") loadModels();
                }}
                className="h-[26px] w-[160px] border border-slate-300 px-2 text-[11px]"
              />
            </div>
          </div>

          <div className="overflow-auto max-h-[calc(100vh-145px)] border border-slate-300 bg-white">
            <table className="w-full min-w-[620px] border-collapse text-[11px]">
              <thead className="bg-[#2d333d] text-white">
                <tr>
                  <th className="border border-slate-400 px-2 py-1.5 text-left">
                    Nom du modèle
                  </th>
                  <th className="border border-slate-400 px-2 py-1.5 text-left">
                    Année scolaire
                  </th>
                  <th className="border border-slate-400 px-2 py-2 text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredModels.map((model) => (
                  <tr key={model.id} className="odd:bg-[#eaf2fb] even:bg-white">
                    <td className="border border-slate-300 px-2 py-[4px] font-medium">
                      {model.title}
                    </td>

                    <td className="border border-slate-300 px-2 py-[4px]">
                      {model.schoolYearName}
                    </td>

                    <td className="border border-slate-300 px-2 py-[4px]">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => openModel(model)}
                          className="rounded border px-2 py-1"
                          title="Modifier"
                        >
                          ✎
                        </button>

                        <button
                          onClick={() => deleteModel(model.id)}
                          className="rounded border px-2 py-1"
                          title="Supprimer"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredModels.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500">
                      Aucun modèle de frais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-[620px] rounded bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#2d333d] px-4 py-3 text-white">
              <h2 className="text-[14px] font-bold">
                Ajouter un modèle de frais
              </h2>
              <button onClick={() => setCreateOpen(false)}>×</button>
            </div>

            <div className="space-y-3 p-4">
              <Field label="Titre">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full border border-slate-300 px-2 py-1.5 text-[12px]"
                  placeholder="Ex: FRAIS DE SCOLARITE 2026/2027 PRIMAIRE"
                />
              </Field>

              <Field label="Année scolaire">
                <select
                  value={schoolYearName}
                  onChange={(event) => setSchoolYearName(event.target.value)}
                  className="w-full border border-slate-300 bg-white px-2 py-2"
                >
                  <option value="">Choisir une année scolaire</option>
                  {schoolYears.map((year) => (
                    <option key={year.id} value={year.name}>
                      {year.name}
                      {year.active ? " — Principale" : ""}
                    </option>
                  ))}
                </select>
              </Field>

              {message && (
                <div className="rounded bg-red-50 p-2 font-bold text-red-600">
                  {message}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="rounded bg-slate-500 px-3 py-1.5 text-white text-[12px]"
                >
                  Fermer
                </button>

                <button
                  onClick={createModel}
                  className="rounded bg-blue-600 px-3 py-1.5 text-white text-[12px]"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editOpen && selectedModel && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-black/50 p-2 md:p-3 md:pt-5">
          <div className="flex max-h-[92vh] w-full max-w-[940px] flex-col rounded bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between bg-[#2d333d] px-3 py-2.5 text-white">
              <h2 className="text-[14px] font-bold">
                Editer un modèle de frais
              </h2>

              <button
                onClick={() => setEditOpen(false)}
                className="text-lg font-black"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden p-3">
              <div className="mb-2 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                <Field label="Titre">
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full border border-slate-300 px-2 py-1.5 text-[12px]"
                  />
                </Field>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={newSpecialColumn}
                    onChange={(event) => setNewSpecialColumn(event.target.value)}
                    placeholder="Ex: Ancien élève, Famille..."
                    className="h-[30px] w-[180px] border border-slate-300 px-2 text-[11px]"
                  />

                  <button
                    onClick={addSpecialColumn}
                    className="h-[30px] rounded bg-[#2d333d] px-3 text-[11px] font-bold text-white"
                  >
                    ✚ Ajouter un tarif
                  </button>
                </div>
              </div>

              {message && (
                <div className="mb-3 rounded bg-red-50 p-2 font-bold text-red-600">
                  {message}
                </div>
              )}
<button
  type="button"
  onClick={addDraftRow}
  className="mb-2 rounded bg-emerald-600 px-2.5 py-1.5 text-[11px] text-white font-black"
>
  + Ajouter une ligne
</button>
              <div className="max-h-[58vh] overflow-auto border border-slate-300">
                <table className="w-full min-w-[760px] border-collapse text-[11px]">
                  <thead className="bg-[#2d333d] text-white">
                    <tr>
                      <th className="sticky top-0 z-20 w-[190px] min-w-[190px] border border-slate-400 bg-[#2d333d] px-1.5 py-1.5 text-left">
                        LIBELLÉ
                      </th>

                      <th className="sticky top-0 z-20 w-[70px] min-w-[70px] border border-slate-400 bg-[#2d333d] px-1.5 py-1.5 text-center">
                        CODE
                      </th>

                      <th className="sticky top-0 z-20 w-[92px] min-w-[92px] border border-slate-400 bg-[#2d333d] px-1.5 py-1.5 text-right">
                        MONTANT
                      </th>

                      {specialColumns.map((column) => (
                        <th
                          key={column}
                          className="sticky top-0 z-20 w-[112px] min-w-[112px] border border-slate-400 bg-[#2d333d] px-1.5 py-1.5 text-center"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{column}</span>

                            <button
                              onClick={() => removeSpecialColumn(column)}
                              className="rounded bg-red-600 px-1.5 py-[1px] text-[10px] text-white"
                              title="Supprimer cette colonne"
                            >
                              ×
                            </button>
                          </div>
                        </th>
                      ))}

                      <th className="sticky top-0 z-20 w-[62px] min-w-[62px] border border-slate-400 bg-[#2d333d] px-1.5 py-1.5 text-center">
                        +
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedModel.tariffs.map((tariff, tariffIndex) => {
                      const isLastSavedTariff = tariffIndex === selectedModel.tariffs.length - 1;

                      return (
                      <tr key={tariff.id} className="odd:bg-[#eaf2fb] even:bg-white">
                        <td className="border border-slate-300 px-2 py-[4px]">
                          {tariff.libelle}
                        </td>

                        <td className="border border-slate-300 px-1.5 py-[4px] text-center">
                          {tariff.code}
                        </td>

                        <td className="border border-slate-300 px-1.5 py-[4px] text-right font-semibold">
                          {formatMoney(tariff.montant)}
                        </td>

                        {specialColumns.map((column) => {
                          const found = tariff.specials.find(
                            (special) => special.name === column
                          );
                          const key = `${tariff.id}-${column}`;

                          return (
                            <td
                              key={column}
                              className="border border-slate-300 px-1.5 py-[4px] text-right font-bold text-blue-600"
                            >
                              {found ? (
                                <div className="flex items-center justify-end gap-1">
                                  <span>{formatMoney(found.amount)}</span>

                                  <button
                                    onClick={() => deleteSpecial(found.id)}
                                    className="rounded bg-red-500 px-1.5 py-[1px] text-[11px] text-white"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <input
                                    value={cellSpecialInputs[key] || ""}
                                    onChange={(event) =>
                                      updateCellInput(
                                        tariff.id,
                                        column,
                                        event.target.value
                                      )
                                    }
                                    placeholder="0"
                                    className="h-[28px] w-full border border-slate-300 px-1.5 py-1 text-right text-[11px] outline-none"
                                  />

                                  <button
                                    onClick={() =>
                                      addSpecialAmountToTariff(tariff.id, column)
                                    }
                                    className="rounded bg-emerald-600 px-2 py-1 text-[11px] text-white"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td className="border border-slate-300 px-1.5 py-[4px] text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => deleteTariff(tariff.id)}
                              className="rounded bg-red-600 px-2 py-1 text-[11px] font-black text-white"
                              title="Supprimer cette ligne"
                            >
                              ×
                            </button>

                            {isLastSavedTariff && draftRows.length === 0 && (
                              <button
                                onClick={addDraftRow}
                                className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-black text-white"
                                title="Ajouter une ligne vide"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}

                    {draftRows.map((row, index) => (
                      <tr key={row.tempId} className="bg-white">
                        <td className="border border-slate-300 p-[3px]">
                          <input
                            value={row.libelle}
                            onChange={(event) =>
                              updateDraftRow(
                                row.tempId,
                                "libelle",
                                event.target.value
                              )
                            }
                            placeholder="Libellé"
                            className="h-[30px] w-full border border-slate-300 px-1.5 py-1 text-[11px] outline-none"
                          />
                        </td>

                        <td className="border border-slate-300 p-[3px]">
                          <input
                            value={row.code}
                            onChange={(event) =>
                              updateDraftRow(row.tempId, "code", event.target.value)
                            }
                            placeholder="Code"
                            className="h-[30px] w-full border border-slate-300 px-1.5 py-1 text-center text-[11px] outline-none"
                          />
                        </td>

                        <td className="border border-slate-300 p-[3px]">
                          <input
                            value={row.montant}
                            onChange={(event) =>
                              updateDraftRow(
                                row.tempId,
                                "montant",
                                formatAmountInput(event.target.value)
                              )
                            }
                            placeholder="Montant"
                            className="h-[30px] w-full border border-slate-300 px-1.5 py-1 text-right text-[11px] outline-none"
                          />
                        </td>

                        {specialColumns.map((column) => (
                          <td key={column} className="border border-slate-300 p-[3px]">
                            <input
                              value={row.specials[column] || ""}
                              onChange={(event) =>
                                updateDraftSpecial(
                                  row.tempId,
                                  column,
                                  event.target.value
                                )
                              }
                              placeholder={column}
                              className="h-[30px] w-full border border-slate-300 px-1.5 py-1 text-right text-[11px] outline-none"
                            />
                          </td>
                        ))}

                        <td className="border border-slate-300 p-1 text-center">
                          <div className="flex justify-center gap-1">
                            {index === draftRows.length - 1 && (
                              <button
                                onClick={addDraftRow}
                                className="rounded bg-emerald-600 px-2 py-1.5 text-[11px] font-black text-white"
                                title="Ajouter une ligne vide"
                              >
                                +
                              </button>
                            )}

                            <button
                              onClick={() =>
                                draftRows.length > 1
                                  ? removeDraftRow(row.tempId)
                                  : clearDraftRow(row.tempId)
                              }
                              className="rounded bg-red-600 px-2 py-1.5 text-[11px] font-black text-white"
                              title={draftRows.length > 1 ? "Supprimer cette ligne" : "Vider cette ligne"}
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex shrink-0 justify-end gap-2">
                <button
                  onClick={() => setEditOpen(false)}
                  className="rounded bg-slate-500 px-3 py-1.5 text-white text-[12px]"
                >
                  Fermer
                </button>

                <button
                  onClick={saveAll}
                  className="rounded bg-blue-600 px-3 py-1.5 text-white text-[12px]"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-slate-600">{label}</span>
      {children}
    </label>
  );
}
