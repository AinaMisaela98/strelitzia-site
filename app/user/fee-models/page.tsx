"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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

type Site = {
  id: number;
  name: string;
  code: string;
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
  siteId?: number | null;
  siteRef?: {
    id: number;
    name: string;
    code: string;
  } | null;
  tariffs: FeeTariff[];
};

type DraftRow = {
  tempId: string;
  libelle: string;
  code: string;
  montant: string;
  specials: Record<string, string>;
};

type SavedTariffDraft = {
  libelle: string;
  code: string;
  montant: string;
};

export default function FeeModelsPage() {
  const router = useRouter();
  const pathname = usePathname();

  const sidebarLinks = [
    { label: "Année scolaire", href: "/user/school-years" },
    { label: "Liste des niveaux", href: "/user/academics" },
    { label: "Modèles de frais", href: "/user/fee-models" },
    { label: "Frais de formation", href: "/user/training-fees" },
    { label: "Activités scolaires", href: "/user/school-activities" },
  ];

  const [models, setModels] = useState<FeeModel[]>([]);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<FeeModel | null>(null);
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [modelToDuplicate, setModelToDuplicate] = useState<FeeModel | null>(null);

  const [title, setTitle] = useState("");
  const [classe, setClasse] = useState("GENERAL");

  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [schoolYearName, setSchoolYearName] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");

  const [specialColumns, setSpecialColumns] = useState<string[]>([]);
  const [newSpecialColumn, setNewSpecialColumn] = useState("");

  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [savedTariffInputs, setSavedTariffInputs] = useState<Record<number, SavedTariffDraft>>({});
  const [cellSpecialInputs, setCellSpecialInputs] = useState<Record<string, string>>({});

  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const activeSchoolYearName = useMemo(() => {
    return schoolYears.find((year) => year.active)?.name || schoolYears[0]?.name || "";
  }, [schoolYears]);

  const selectedSite = useMemo(() => {
    return sites.find((site) => String(site.id) === String(selectedSiteId)) || null;
  }, [sites, selectedSiteId]);

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    const selectedYear = (yearFilter || activeSchoolYearName || "").trim();

    return models.filter((model) => {
      const modelYear = String(model.schoolYearName || "").trim();
      const sameYear = !selectedYear || modelYear === selectedYear;
      const modelSite = String(model.siteRef?.name || "").trim();
      const matchSearch =
        !q ||
        `${model.title} ${model.schoolYearName} ${model.classe} ${modelSite}`
          .toLowerCase()
          .includes(q);

      return sameYear && matchSearch;
    });
  }, [models, search, yearFilter, activeSchoolYearName]);

  useEffect(() => {
    loadSchoolYears();
    loadSites();
  }, []);

  useEffect(() => {
    if (!yearFilter || !selectedSiteId) return;
    loadModels();
  }, [yearFilter, selectedSiteId]);

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

  function buildSavedTariffInputs(model: FeeModel) {
    return (model.tariffs || []).reduce<Record<number, SavedTariffDraft>>((acc, tariff) => {
      acc[tariff.id] = {
        libelle: tariff.libelle || "",
        code: tariff.code || "",
        montant: formatAmountInput(tariff.montant),
      };
      return acc;
    }, {});
  }

  function buildCellSpecialInputs(model: FeeModel, columns: string[]) {
    const inputs: Record<string, string> = {};

    for (const tariff of model.tariffs || []) {
      for (const column of columns) {
        const found = (tariff.specials || []).find((special) => special.name === column);
        inputs[`${tariff.id}-${column}`] = found ? formatAmountInput(found.amount) : "";
      }
    }

    return inputs;
  }

  function sortedTariffs(model: FeeModel) {
    return [...(model.tariffs || [])].sort((a, b) => a.id - b.id);
  }

  function extractSpecialColumns(model: FeeModel) {
    const names = (model.tariffs || []).flatMap((tariff) =>
      (tariff.specials || []).map((special) => special.name),
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
        return Array.from(new Set([...fromDb, ...saved.filter((name) => typeof name === "string")]));
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
        JSON.stringify(Array.from(new Set(columns))),
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
        : text || "Réponse API invalide.",
    );
  }

  async function loadSites() {
    try {
      const res = await fetch(`/api/sites?_ts=${Date.now()}`, { cache: "no-store" });
      const data = await safeJson(res);
      const list: Site[] = Array.isArray(data?.sites) ? data.sites : [];

      setSites(list);

      const active = list.find((site) => site.active) || list[0];
      if (active) setSelectedSiteId(String(active.id));
    } catch (error) {
      console.error(error);
      setSites([]);
      setSelectedSiteId("");
      setMessage("Erreur chargement sites.");
    }
  }

  async function loadSchoolYears() {
    try {
      const res = await fetch("/api/school-years", { cache: "no-store" });
      const data = await safeJson(res);

      if (Array.isArray(data)) {
        setSchoolYears(data);

        const active = data.find((year: SchoolYear) => year.active);
        const defaultYear = active?.name || data[0]?.name || "";

        setSchoolYearName(defaultYear);
        setYearFilter(defaultYear);
      }
    } catch (error) {
      console.error(error);
      setMessage("Erreur chargement années scolaires.");
    }
  }

  async function loadModels() {
    try {
      const params = new URLSearchParams();
      const selectedYear = (yearFilter || activeSchoolYearName || "").trim();

      if (search.trim()) params.set("q", search.trim());

      if (selectedYear) {
        params.set("schoolYearName", selectedYear);
        params.set("anneeScolaire", selectedYear);
        params.set("year", selectedYear);
      }

      if (selectedSiteId) {
        params.set("siteId", selectedSiteId);
      }

      const res = await fetch(`/api/fee-models?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await safeJson(res);

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.models)
          ? data.models
          : Array.isArray(data.feeModels)
            ? data.feeModels
            : [];

      setModels(list);
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

    if (!selectedSiteId) {
      setMessage("Veuillez choisir un site.");
      return;
    }

    try {
      const finalYear = schoolYearName || activeSchoolYearName;

      const res = await fetch("/api/fee-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          classe: "GENERAL",
          schoolYearName: finalYear,
          siteId: selectedSiteId,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setMessage(data.message || "Erreur création modèle.");
        return;
      }

      resetCreateForm();
      setYearFilter(finalYear);
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
      setSavedTariffInputs(buildSavedTariffInputs(data));
      setTitle(data.title);
      setClasse(data.classe || "GENERAL");
      setSchoolYearName(data.schoolYearName);
      if (data.siteId) setSelectedSiteId(String(data.siteId));
      const columns = loadPersistedSpecialColumns(data);
      setSpecialColumns(columns);
      setCellSpecialInputs(buildCellSpecialInputs(data, columns));
      setDraftRows([]);
      setEditOpen(true);
    } catch (error: any) {
      console.error("Erreur ouverture modèle:", error);
      setMessage(error?.message || "Erreur ouverture modèle.");
    }
  }

  function askDuplicateModel(model: FeeModel) {
    setMessage("");
    setModelToDuplicate(model);
    setDuplicateConfirmOpen(true);
  }

  function cancelDuplicateModel() {
    if (isSaving) return;
    setDuplicateConfirmOpen(false);
    setModelToDuplicate(null);
  }

  async function confirmDuplicateModel() {
    if (!modelToDuplicate || isSaving) return;

    await duplicateModel(modelToDuplicate);
  }

  async function duplicateModel(model: FeeModel) {
    if (isSaving) return;

    try {
      setIsSaving(true);
      setMessage("");

      const sourceRes = await fetch(`/api/fee-models/${model.id}`);
      const source = await safeJson(sourceRes);

      if (!sourceRes.ok) {
        setMessage(source.message || "Erreur ouverture du modèle à dupliquer.");
        return;
      }

      const createRes = await fetch("/api/fee-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Copie - ${source.title}`,
          classe: source.classe || "GENERAL",
          schoolYearName: source.schoolYearName || yearFilter || activeSchoolYearName,
          siteId: source.siteId || selectedSiteId,
        }),
      });

      const duplicatedModel = await safeJson(createRes);

      if (!createRes.ok) {
        setMessage(duplicatedModel.message || "Erreur duplication modèle.");
        return;
      }

      const duplicatedSpecialColumns = loadPersistedSpecialColumns(source);

      for (const tariff of sortedTariffs(source)) {
        const tariffRes = await fetch("/api/fee-tariffs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feeModelId: duplicatedModel.id,
            libelle: tariff.libelle,
            code: tariff.code,
            montant: tariff.montant,
          }),
        });

        const duplicatedTariff = await safeJson(tariffRes);

        if (!tariffRes.ok) {
          setMessage(duplicatedTariff.message || "Erreur duplication tarif.");
          return;
        }

        for (const special of tariff.specials || []) {
          const specialRes = await fetch("/api/fee-special-tariffs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              feeTariffId: duplicatedTariff.id,
              name: special.name,
              amount: special.amount,
            }),
          });

          const duplicatedSpecial = await safeJson(specialRes);

          if (!specialRes.ok) {
            setMessage(duplicatedSpecial.message || "Erreur duplication tarif spécial.");
            return;
          }
        }
      }

      persistSpecialColumns(duplicatedModel.id, duplicatedSpecialColumns);

      const fullDuplicatedRes = await fetch(`/api/fee-models/${duplicatedModel.id}`);
      const fullDuplicated = await safeJson(fullDuplicatedRes);

      if (!fullDuplicatedRes.ok) {
        setMessage(fullDuplicated.message || "Modèle dupliqué, mais ouverture impossible.");
        await loadModels();
        return;
      }

      setSelectedModel(fullDuplicated);
      setSavedTariffInputs(buildSavedTariffInputs(fullDuplicated));
      setTitle(fullDuplicated.title);
      setClasse(fullDuplicated.classe || "GENERAL");
      setSchoolYearName(fullDuplicated.schoolYearName);
      if (fullDuplicated.siteId) setSelectedSiteId(String(fullDuplicated.siteId));
      setSpecialColumns(duplicatedSpecialColumns);
      setCellSpecialInputs(buildCellSpecialInputs(fullDuplicated, duplicatedSpecialColumns));
      setDraftRows([]);
      setCreateOpen(false);
      setEditOpen(true);

      await loadModels();
      setDuplicateConfirmOpen(false);
      setModelToDuplicate(null);
      showSuccess("Modèle dupliqué avec tous ses frais et tarifs. Modifiez la copie puis enregistrez.");
    } catch (error: any) {
      console.error("Erreur duplication modèle:", error);
      setMessage(error?.message || "Erreur duplication modèle.");
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshSelectedModel() {
    if (!selectedModel) return;

    const res = await fetch(`/api/fee-models/${selectedModel.id}`);
    const data = await safeJson(res);

    if (res.ok) {
      setSelectedModel(data);
      setSavedTariffInputs(buildSavedTariffInputs(data));
      setSpecialColumns((previous) => {
        const merged = Array.from(new Set([...previous, ...loadPersistedSpecialColumns(data)]));

        persistSpecialColumns(data.id, merged);
        setCellSpecialInputs(buildCellSpecialInputs(data, merged));

        return merged;
      });
    }

    await loadModels();
  }

  async function saveAll() {
    if (!selectedModel || isSaving) return;

    try {
      setIsSaving(true);
      setMessage("");
      persistSpecialColumns(selectedModel.id, specialColumns);

      const savedRows = sortedTariffs(selectedModel);

      for (const tariff of savedRows) {
        const input = savedTariffInputs[tariff.id];
        if (!input) continue;

        if (!input.libelle.trim() || !input.code.trim() || !input.montant.trim()) {
          setMessage("Chaque ligne enregistrée doit avoir Libellé, Code et Montant.");
          return;
        }
      }

      const rowsToSave = draftRows.filter(
        (row) =>
          row.libelle.trim() ||
          row.code.trim() ||
          row.montant.trim() ||
          Object.values(row.specials).some((v: string) => v.trim()),
      );

      for (const row of rowsToSave) {
        if (!row.libelle.trim() || !row.code.trim() || !row.montant.trim()) {
          setMessage("Chaque nouvelle ligne doit avoir Libellé, Code et Montant.");
          return;
        }
      }

      const allCodes = [
        ...savedRows
          .map((tariff) => savedTariffInputs[tariff.id]?.code.trim().toLowerCase())
          .filter(Boolean),
        ...rowsToSave.map((row) => row.code.trim().toLowerCase()).filter(Boolean),
      ];

      const duplicatedCode = allCodes.find(
        (code, index) => allCodes.findIndex((item) => item === code) !== index,
      );

      if (duplicatedCode) {
        setMessage(`Le code "${duplicatedCode}" existe déjà.`);
        return;
      }

      const updateRes = await fetch(`/api/fee-models/${selectedModel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          classe: "GENERAL",
          schoolYearName: schoolYearName || activeSchoolYearName,
          siteId: selectedSiteId,
        }),
      });

      const updated = await safeJson(updateRes);

      if (!updateRes.ok) {
        setMessage(updated.message || "Erreur modification modèle.");
        return;
      }

      for (const tariff of savedRows) {
        const input = savedTariffInputs[tariff.id];
        if (!input) continue;

        const hasChanged =
          input.libelle.trim() !== tariff.libelle ||
          input.code.trim() !== tariff.code ||
          amountToNumber(input.montant) !== tariff.montant;

        if (hasChanged) {
          const tariffUpdateRes = await fetch(`/api/fee-tariffs/${tariff.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              libelle: input.libelle.trim(),
              code: input.code.trim(),
              montant: amountToNumber(input.montant),
            }),
          });

          const tariffUpdateData = await safeJson(tariffUpdateRes);

          if (!tariffUpdateRes.ok) {
            setMessage(tariffUpdateData.message || "Erreur modification tarif.");
            return;
          }
        }

        for (const columnName of specialColumns) {
          const key = `${tariff.id}-${columnName}`;
          const inputAmount = cellSpecialInputs[key] || "";
          const found = (tariff.specials || []).find((special) => special.name === columnName);
          const numericAmount = amountToNumber(inputAmount);

          if (inputAmount.trim()) {
            if (found) {
              if (found.amount !== numericAmount) {
                const deleteRes = await fetch(`/api/fee-special-tariffs/${found.id}`, {
                  method: "DELETE",
                });

                if (!deleteRes.ok) {
                  setMessage("Erreur modification tarif spécial.");
                  return;
                }

                const createRes = await fetch("/api/fee-special-tariffs", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    feeTariffId: tariff.id,
                    name: columnName,
                    amount: numericAmount,
                  }),
                });

                const createData = await safeJson(createRes);

                if (!createRes.ok) {
                  setMessage(createData.message || "Erreur modification tarif spécial.");
                  return;
                }
              }
            } else {
              const createRes = await fetch("/api/fee-special-tariffs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  feeTariffId: tariff.id,
                  name: columnName,
                  amount: numericAmount,
                }),
              });

              const createData = await safeJson(createRes);

              if (!createRes.ok) {
                setMessage(createData.message || "Erreur ajout tarif spécial.");
                return;
              }
            }
          } else if (found) {
            const deleteRes = await fetch(`/api/fee-special-tariffs/${found.id}`, {
              method: "DELETE",
            });

            if (!deleteRes.ok) {
              setMessage("Erreur suppression montant spécial.");
              return;
            }
          }
        }
      }

      for (const row of rowsToSave) {
        const tariffRes = await fetch("/api/fee-tariffs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
              headers: { "Content-Type": "application/json" },
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
    } finally {
      setIsSaving(false);
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
      if (selectedModel) persistSpecialColumns(selectedModel.id, next);
      return next;
    });

    setCellSpecialInputs((previous) => {
      const next = { ...previous };

      if (selectedModel) {
        for (const tariff of sortedTariffs(selectedModel)) {
          const savedInput = savedTariffInputs[tariff.id];
          next[`${tariff.id}-${name}`] = formatAmountInput(savedInput?.montant || tariff.montant);
        }
      }

      return next;
    });

    setDraftRows((previous) =>
      previous.map((row) => ({
        ...row,
        specials: { ...row.specials, [name]: formatAmountInput(row.montant) },
      })),
    );

    setNewSpecialColumn("");
    setMessage("");
    showSuccess(`Tarif "${name}" ajouté avec duplication du montant principal.`);
  }

  function removeSpecialColumn(name: string) {
    if (!confirm(`Supprimer la colonne "${name}" ?`)) return;

    setSpecialColumns((previous) => {
      const next = previous.filter((column) => column !== name);
      if (selectedModel) persistSpecialColumns(selectedModel.id, next);
      return next;
    });

    setDraftRows((previous) =>
      previous.map((row) => {
        const specials = { ...row.specials };
        delete specials[name];
        return { ...row, specials };
      }),
    );

    showSuccess(`Tarif "${name}" supprimé.`);
  }

  function clearDraftRow(tempId: string) {
    setDraftRows((previous) =>
      previous.map((row) => (row.tempId === tempId ? createEmptyDraftRow() : row)),
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

  function updateSavedTariffInput(
    tariffId: number,
    field: "libelle" | "code" | "montant",
    value: string,
  ) {
    setSavedTariffInputs((previous) => ({
      ...previous,
      [tariffId]: {
        ...previous[tariffId],
        [field]: field === "montant" ? formatAmountInput(value) : value,
      },
    }));
  }

  function updateDraftRow(
    tempId: string,
    field: "libelle" | "code" | "montant",
    value: string,
  ) {
    setDraftRows((previous) =>
      previous.map((row) =>
        row.tempId === tempId
          ? { ...row, [field]: field === "montant" ? formatAmountInput(value) : value }
          : row,
      ),
    );
  }

  function updateDraftSpecial(tempId: string, column: string, value: string) {
    setDraftRows((previous) =>
      previous.map((row) =>
        row.tempId === tempId
          ? { ...row, specials: { ...row.specials, [column]: formatAmountInput(value) } }
          : row,
      ),
    );
  }

  function updateCellInput(tariffId: number, columnName: string, value: string) {
    setCellSpecialInputs((previous) => ({
      ...previous,
      [`${tariffId}-${columnName}`]: formatAmountInput(value),
    }));
  }

  async function deleteTariff(id: number) {
    if (!confirm("Supprimer ce tarif ?")) return;

    await fetch(`/api/fee-tariffs/${id}`, { method: "DELETE" });
    await refreshSelectedModel();
    showSuccess("Tarif supprimé.");
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

        <section className="flex-1 overflow-hidden p-2 md:p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
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

          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <label className="mb-1 block text-xs font-bold">
                Site
              </label>
              <select
                value={selectedSiteId}
                onChange={(event) => setSelectedSiteId(event.target.value)}
                className="h-[30px] min-w-[230px] border border-slate-300 bg-white px-2 text-[11px]"
              >
                {sites.length === 0 && <option value="">Aucun site</option>}

                {sites.map((site) => (
                  <option key={site.id} value={String(site.id)}>
                    Site : {site.name}
                    {site.active ? " — Actif" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">
                Filtre Année scolaire
              </label>
              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                className="h-[30px] min-w-[210px] border border-slate-300 bg-white px-2 text-[11px]"
              >
                {schoolYears.map((year) => (
                  <option key={year.id} value={year.name}>
                    {year.name}
                    {year.active ? " — Principale" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs">Recherche</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") loadModels();
                }}
                className="h-[30px] w-[180px] border border-slate-300 px-2 text-[11px]"
                placeholder="Nom du modèle..."
              />
            </div>
          </div>

          <div className="max-h-[calc(100vh-145px)] overflow-auto border border-slate-300 bg-white">
            <table className="w-full min-w-[720px] border-collapse text-[11px]">
              <thead className="bg-[#2d333d] text-white">
                <tr>
                  <th className="border border-slate-400 px-2 py-1.5 text-left">
                    Nom du modèle
                  </th>
                  <th className="border border-slate-400 px-2 py-1.5 text-left">
                    Année scolaire
                  </th>
                  <th className="border border-slate-400 px-2 py-1.5 text-left">
                    Site
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
                      {model.siteRef?.name || selectedSite?.name || "-"}
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
                          type="button"
                          onClick={() => askDuplicateModel(model)}
                          disabled={isSaving}
                          className="rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Dupliquer"
                        >
                          ⧉
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
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Aucun modèle de frais pour ce site et cette année scolaire.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>


      {duplicateConfirmOpen && modelToDuplicate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-[#2d333d] px-4 py-3 text-white">
              <h2 className="text-[14px] font-black">Confirmation duplication</h2>
            </div>

            <div className="space-y-3 p-4 text-[12px]">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 font-bold text-amber-800">
                Voulez-vous vraiment dupliquer ce modèle de frais ?
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="font-black text-slate-800">{modelToDuplicate.title}</div>
                <div className="mt-1 text-slate-600">
                  Année scolaire : {modelToDuplicate.schoolYearName || "-"}
                </div>
                <div className="text-slate-600">
                  Site : {modelToDuplicate.siteRef?.name || selectedSite?.name || "-"}
                </div>
              </div>

              <p className="leading-relaxed text-slate-600">
                La copie gardera automatiquement tous les frais, tous les tarifs et les montants
                déjà créés. Vous pourrez ensuite modifier seulement ce qui doit changer.
              </p>

              {message && (
                <div className="rounded bg-red-50 p-2 font-bold text-red-600">
                  {message}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cancelDuplicateModel}
                  disabled={isSaving}
                  className="rounded bg-slate-500 px-3 py-2 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={confirmDuplicateModel}
                  disabled={isSaving}
                  className="rounded bg-blue-600 px-3 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Duplication..." : "Oui, dupliquer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <Field label="Site">
                <select
                  value={selectedSiteId}
                  onChange={(event) => setSelectedSiteId(event.target.value)}
                  className="w-full border border-slate-300 bg-white px-2 py-2"
                >
                  {sites.map((site) => (
                    <option key={site.id} value={String(site.id)}>
                      {site.name}
                      {site.active ? " — Actif" : ""}
                    </option>
                  ))}
                </select>
              </Field>

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
                  className="rounded bg-slate-500 px-3 py-1.5 text-[12px] text-white"
                >
                  Fermer
                </button>

                <button
                  onClick={createModel}
                  className="rounded bg-blue-600 px-3 py-1.5 text-[12px] text-white"
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

              <button onClick={() => setEditOpen(false)} className="text-lg font-black">
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden p-3">
              <div className="mb-2 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                <div className="grid gap-2 md:grid-cols-3">
                  <Field label="Site">
                    <select
                      value={selectedSiteId}
                      onChange={(event) => setSelectedSiteId(event.target.value)}
                      className="w-full border border-slate-300 bg-white px-2 py-1.5 text-[12px]"
                    >
                      {sites.map((site) => (
                        <option key={site.id} value={String(site.id)}>
                          {site.name}
                          {site.active ? " — Actif" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Année scolaire">
                    <select
                      value={schoolYearName}
                      onChange={(event) => setSchoolYearName(event.target.value)}
                      className="w-full border border-slate-300 bg-white px-2 py-1.5 text-[12px]"
                    >
                      {schoolYears.map((year) => (
                        <option key={year.id} value={year.name}>
                          {year.name}
                          {year.active ? " — Principale" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Titre">
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="w-full border border-slate-300 px-2 py-1.5 text-[12px]"
                    />
                  </Field>
                </div>

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
                disabled={isSaving}
                className="mb-2 rounded bg-emerald-600 px-2.5 py-1.5 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                + Ajouter une ligne
              </button>

              <div className="max-h-[54vh] overflow-auto border border-slate-300">
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
                    {sortedTariffs(selectedModel).map((tariff, tariffIndex) => {
                      const isLastSavedTariff =
                        tariffIndex === sortedTariffs(selectedModel).length - 1;
                      const savedInput = savedTariffInputs[tariff.id] || {
                        libelle: tariff.libelle,
                        code: tariff.code,
                        montant: formatAmountInput(tariff.montant),
                      };

                      return (
                        <tr key={tariff.id} className="odd:bg-[#eaf2fb] even:bg-white">
                          <td className="border border-slate-300 p-[3px]">
                            <input
                              value={savedInput.libelle}
                              onChange={(event) =>
                                updateSavedTariffInput(tariff.id, "libelle", event.target.value)
                              }
                              disabled={isSaving}
                              className="h-[30px] w-full border border-slate-300 bg-white px-1.5 py-1 text-[11px] outline-none disabled:bg-slate-100"
                            />
                          </td>

                          <td className="border border-slate-300 p-[3px]">
                            <input
                              value={savedInput.code}
                              onChange={(event) =>
                                updateSavedTariffInput(tariff.id, "code", event.target.value)
                              }
                              disabled={isSaving}
                              className="h-[30px] w-full border border-slate-300 bg-white px-1.5 py-1 text-center text-[11px] outline-none disabled:bg-slate-100"
                            />
                          </td>

                          <td className="border border-slate-300 p-[3px]">
                            <input
                              value={savedInput.montant}
                              onChange={(event) =>
                                updateSavedTariffInput(tariff.id, "montant", event.target.value)
                              }
                              disabled={isSaving}
                              className="h-[30px] w-full border border-slate-300 bg-white px-1.5 py-1 text-right text-[11px] font-semibold outline-none disabled:bg-slate-100"
                            />
                          </td>

                          {specialColumns.map((column) => {
                            const key = `${tariff.id}-${column}`;

                            return (
                              <td key={column} className="border border-slate-300 p-[3px]">
                                <input
                                  value={cellSpecialInputs[key] || ""}
                                  onChange={(event) =>
                                    updateCellInput(tariff.id, column, event.target.value)
                                  }
                                  placeholder="0"
                                  disabled={isSaving}
                                  className="h-[30px] w-full border border-slate-300 bg-white px-1.5 py-1 text-right text-[11px] font-semibold text-blue-700 outline-none disabled:bg-slate-100"
                                />
                              </td>
                            );
                          })}

                          <td className="border border-slate-300 px-1.5 py-[4px] text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => deleteTariff(tariff.id)}
                                disabled={isSaving}
                                className="rounded bg-red-600 px-2 py-1 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                                title="Supprimer cette ligne"
                              >
                                ×
                              </button>

                              {isLastSavedTariff && draftRows.length === 0 && (
                                <button
                                  onClick={addDraftRow}
                                  disabled={isSaving}
                                  className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                            onChange={(event) => updateDraftRow(row.tempId, "libelle", event.target.value)}
                            placeholder="Libellé"
                            disabled={isSaving}
                            className="h-[30px] w-full border border-slate-300 px-1.5 py-1 text-[11px] outline-none disabled:bg-slate-100"
                          />
                        </td>

                        <td className="border border-slate-300 p-[3px]">
                          <input
                            value={row.code}
                            onChange={(event) => updateDraftRow(row.tempId, "code", event.target.value)}
                            placeholder="Code"
                            disabled={isSaving}
                            className="h-[30px] w-full border border-slate-300 px-1.5 py-1 text-center text-[11px] outline-none disabled:bg-slate-100"
                          />
                        </td>

                        <td className="border border-slate-300 p-[3px]">
                          <input
                            value={row.montant}
                            onChange={(event) => updateDraftRow(row.tempId, "montant", event.target.value)}
                            placeholder="Montant"
                            disabled={isSaving}
                            className="h-[30px] w-full border border-slate-300 px-1.5 py-1 text-right text-[11px] outline-none disabled:bg-slate-100"
                          />
                        </td>

                        {specialColumns.map((column) => (
                          <td key={column} className="border border-slate-300 p-[3px]">
                            <input
                              value={row.specials[column] || ""}
                              onChange={(event) =>
                                updateDraftSpecial(row.tempId, column, event.target.value)
                              }
                              placeholder={column}
                              disabled={isSaving}
                              className="h-[30px] w-full border border-slate-300 px-1.5 py-1 text-right text-[11px] outline-none disabled:bg-slate-100"
                            />
                          </td>
                        ))}

                        <td className="border border-slate-300 p-1 text-center">
                          <div className="flex justify-center gap-1">
                            {index === draftRows.length - 1 && (
                              <button
                                onClick={addDraftRow}
                                disabled={isSaving}
                                className="rounded bg-emerald-600 px-2 py-1.5 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                              disabled={isSaving}
                              className="rounded bg-red-600 px-2 py-1.5 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
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

              <div className="sticky bottom-0 z-40 -mx-3 mt-3 flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-3 py-3 shadow-[0_-8px_18px_rgba(15,23,42,0.12)]">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={isSaving}
                  className="rounded bg-slate-500 px-4 py-2 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Fermer
                </button>

                <button
                  type="button"
                  onClick={saveAll}
                  disabled={isSaving}
                  className={`rounded px-4 py-2 text-[12px] font-bold text-white ${
                    isSaving
                      ? "cursor-not-allowed bg-slate-400 opacity-70"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-slate-600">{label}</span>
      {children}
    </label>
  );
}
