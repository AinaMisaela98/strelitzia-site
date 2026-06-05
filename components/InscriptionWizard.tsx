"use client";

import { useEffect, useMemo, useState } from "react";

type AuthUser = {
  name: string;
  email: string;
  role: string;
};

type Site = {
  id: number;
  name: string;
  code?: string;
  active: boolean;
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

type TrainingFee = {
  id: number;
  libelle?: string;
  intitule?: string;
  title?: string;
  name?: string;
  code?: string;
  montant?: number;
  amount?: number;
  tarif?: number;
  montantTotal?: number;
  value?: number;
  specials?: Record<string, any> | Array<any> | string | null;
  specialRates?: Record<string, any> | Array<any> | string | null;
  tarifsSpeciaux?: Record<string, any> | Array<any> | string | null;
  tarifs?: Record<string, any> | Array<any> | string | null;
};

type FeeModel = {
  id: number;
  title?: string;
  name?: string;
  libelle?: string;
  label?: string;
  schoolYearName?: string;
  classe?: string;
  className?: string;
  classRoomName?: string;
  classRoomId?: number;
  classId?: number;
  tariffs?: TrainingFee[];
  rows?: TrainingFee[];
  details?: TrainingFee[];
  fees?: TrainingFee[];
  items?: TrainingFee[];
};

type OptionType = string | { label: string; value: string };

const steps = [
  "Info sur l’étudiant",
  "Info parents",
  "Tuteur",
  "Niveau & frais",
  "Activité",
  "Validation",
];

const stepIcons = ["👨‍🎓", "👨‍👩‍👧", "🧑‍💼", "🎓", "🎨", "✅"];
const today = new Date().toISOString().split("T")[0];

function formatAmount(value: number | string) {
  return String(value || 0)
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function normalizeArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.models)) return value.models;
  if (Array.isArray(value?.feeModels)) return value.feeModels;
  if (Array.isArray(value?.trainingFees)) return value.trainingFees;
  if (Array.isArray(value?.fees)) return value.fees;
  if (Array.isArray(value?.tariffs)) return value.tariffs;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.details)) return value.details;
  return [];
}

function modelTitle(model?: FeeModel | null) {
  return String(
    model?.title || model?.name || model?.libelle || model?.label || `Modèle ${model?.id || ""}`
  ).trim();
}

function getModelRows(model?: FeeModel | null): TrainingFee[] {
  if (!model) return [];
  const rows = normalizeArray(model.tariffs || model.rows || model.details || model.fees || model.items);
  return rows as TrainingFee[];
}

function getFeeRowStableId(row: TrainingFee, index: number) {
  return String(
    (row as any).id ||
      (row as any).feeTariffId ||
      (row as any).tariffId ||
      `${feeLabel(row)}-${(row as any).code || ""}-${index}`
  );
}

function feeLabel(fee: TrainingFee) {
  return fee.libelle || fee.intitule || fee.title || fee.name || "Frais";
}

function parseAmount(value: any) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/[^\d.-]/g, "");

  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

function feeAmount(fee: TrainingFee) {
  return parseAmount(fee.montant ?? fee.montantTotal ?? fee.amount ?? fee.tarif ?? fee.value ?? 0);
}

function parseJsonObject(value: any) {
  if (!value) return {} as Record<string, any>;

  if (Array.isArray(value)) {
    return value.reduce<Record<string, any>>((acc, item) => {
      const key = String(
        item?.name ||
          item?.nom ||
          item?.label ||
          item?.libelle ||
          item?.tarifName ||
          item?.tarif ||
          item?.type ||
          ""
      ).trim();

      if (key) {
        acc[key] =
          item?.montant ??
          item?.amount ??
          item?.value ??
          item?.tarifAmount ??
          item?.price ??
          0;
      }

      return acc;
    }, {});
  }

  if (typeof value === "object") return value as Record<string, any>;
  if (typeof value !== "string") return {} as Record<string, any>;

  try {
    const parsed = JSON.parse(value);
    return parseJsonObject(parsed);
  } catch {
    return {};
  }
}

function getSpecialTarifs(fee: TrainingFee) {
  return {
    ...parseJsonObject(fee.specials),
    ...parseJsonObject(fee.specialRates),
    ...parseJsonObject(fee.tarifsSpeciaux),
    ...parseJsonObject(fee.tarifs),
  } as Record<string, any>;
}

function normalizeTarifName(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function feeAmountByTarif(fee: TrainingFee, tarifName: string) {
  const principal = feeAmount(fee);
  const cleanTarif = String(tarifName || "Principal").trim();

  if (!cleanTarif || normalizeTarifName(cleanTarif) === "principal") {
    return principal;
  }

  const specials = getSpecialTarifs(fee);

  if (Object.prototype.hasOwnProperty.call(specials, cleanTarif)) {
    return parseAmount(specials[cleanTarif]);
  }

  const matchedKey = Object.keys(specials).find(
    (key) => normalizeTarifName(key) === normalizeTarifName(cleanTarif)
  );

  if (matchedKey) {
    return parseAmount(specials[matchedKey]);
  }

  return principal;
}

export default function InscriptionWizard({ user }: { user: AuthUser }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingFees, setLoadingFees] = useState(false);

  const [academics, setAcademics] = useState<{
    year?: string;
    levels: AcademicLevel[];
  }>({ levels: [] });

  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedSiteName, setSelectedSiteName] = useState("Strelitzia School");

  const [feeModels, setFeeModels] = useState<FeeModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedFeeModelId, setSelectedFeeModelId] = useState("");
  const [selectedFeeModelDetails, setSelectedFeeModelDetails] = useState<FeeModel | null>(null);
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);
  const [selectedTarif, setSelectedTarif] = useState("");

  const [form, setForm] = useState({
    dateInscription: today,
    matricule: "",
    photoUrl: "",

    nom: "",
    prenoms: "",
    sexe: "",
    dateNaissance: "",
    lieuNaissance: "",
    telephone: "",
    adresse: "",
    signeParticulier: "",
    maladieAllergie: "",
    email: "",

    pereNom: "",
    pereTel: "",
    mereNom: "",
    mereTel: "",
    parentAdresse: "",

    tuteurNom: "",
    tuteurLien: "",
    tuteurTel: "",
    tuteurAdresse: "",

    niveau: "",
    classe: "",
    section: "",

    activite: "",
    remarque: "",
  });

  useEffect(() => {
    loadAcademics();
    loadSites();
  }, []);

  useEffect(() => {
    loadFeeModelsByClass();
  }, [selectedClassId, selectedSiteId, academics.year, academics.levels]);

  async function loadSites() {
    try {
      const res = await fetch(`/api/sites?_ts=${Date.now()}`, {
        cache: "no-store",
      });

      const data = await res.json();
      const list: Site[] = Array.isArray(data?.sites) ? data.sites : [];

      setSites(list);

      const firstActive = list.find((site) => site.active) || list[0];

      if (firstActive) {
        setSelectedSiteId(String(firstActive.id));
        setSelectedSiteName(firstActive.name || "Strelitzia School");
      }
    } catch {
      setSites([]);
      setSelectedSiteId("");
      setSelectedSiteName("Strelitzia School");
    }
  }

  async function loadAcademics() {
    try {
      const res = await fetch("/api/academics", { cache: "no-store" });
      const data = await res.json();

      if (data?.levels) {
        setAcademics(data);
      }
    } catch {
      setAcademics({ levels: [] });
    }
  }

  async function loadFeeModelsByClass() {
    const classRoomId = Number(selectedClassId);
    const siteId = Number(selectedSiteId);
    const className = String(
      academics.levels
        .flatMap((level) => level.classes || [])
        .find((classe) => String(classe.id) === String(selectedClassId))?.name ||
        form.classe ||
        ""
    ).trim();

    setFeeModels([]);
    setSelectedFeeModelId("");
    setSelectedFeeModelDetails(null);
    setSelectedFeeIds([]);
    setSelectedTarif("");

    if (!classRoomId || !siteId || !className) return;

    try {
      setLoadingModels(true);
      setLoadingFees(true);

      const buildParams = (classeValue: string) => {
        const params = new URLSearchParams();

        if (academics.year) {
          params.set("schoolYearName", academics.year);
          params.set("anneeScolaire", academics.year);
          params.set("year", academics.year);
        }

        params.set("siteId", String(siteId));
        params.set("classRoomId", String(classRoomId));
        params.set("classId", String(classRoomId));
        params.set("classe", classeValue);
        params.set("className", classeValue);
        params.set("classRoomName", classeValue);

        return params;
      };

      async function fetchModels(classeValue: string) {
        const params = buildParams(classeValue);
        const res = await fetch(`/api/fee-models?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error("Erreur chargement modèles de frais:", data);
          return [] as FeeModel[];
        }

        return normalizeArray(data) as FeeModel[];
      }

      let models = await fetchModels(className);

      // Raha natao GENERAL ilay modèle dia aseho ihany rehefa voafidy classe.
      if (models.length === 0) {
        models = await fetchModels("GENERAL");
      }

      setFeeModels(models);
    } catch (error) {
      console.error("loadFeeModelsByClass:", error);
      setFeeModels([]);
    } finally {
      setLoadingModels(false);
      setLoadingFees(false);
    }
  }

  async function selectFeeModel(modelId: string) {
    setSelectedFeeModelId(modelId);
    setSelectedFeeModelDetails(null);
    setSelectedFeeIds([]);
    setSelectedTarif("");

    if (!modelId) return;

    const fromList = feeModels.find((model) => String(model.id) === modelId) || null;

    try {
      setLoadingFees(true);
      const res = await fetch(`/api/fee-models/${modelId}`, { cache: "no-store" });
      const data = await res.json();
      const detail = (data?.data || data?.model || data) as FeeModel;
      const finalModel = { ...(fromList || {}), ...(detail || {}) } as FeeModel;
      const rows = getModelRows(finalModel);

      setSelectedFeeModelDetails(finalModel);
      setSelectedFeeIds(rows.map((row, index) => getFeeRowStableId(row, index)));
    } catch {
      const rows = getModelRows(fromList);
      setSelectedFeeModelDetails(fromList);
      setSelectedFeeIds(rows.map((row, index) => getFeeRowStableId(row, index)));
    } finally {
      setLoadingFees(false);
    }
  }

  function update(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleFee(id: string) {
    if (selectedFeeIds.includes(id)) {
      setSelectedFeeIds(selectedFeeIds.filter((x) => x !== id));
    } else {
      setSelectedFeeIds([...selectedFeeIds, id]);
    }
  }

  function next() {
    if (step < steps.length - 1) setStep(step + 1);
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  const selectedLevel = academics.levels.find(
    (level) => String(level.id) === selectedLevelId
  );

  const selectedClass = selectedLevel?.classes.find(
    (classe) => String(classe.id) === selectedClassId
  );

  const selectedFeeRows = useMemo(() => {
    return getModelRows(selectedFeeModelDetails);
  }, [selectedFeeModelDetails]);

  const availableTarifs = useMemo(() => {
    if (!selectedFeeModelId) return [];

    const names = new Set<string>(["Principal"]);

    selectedFeeRows.forEach((fee) => {
      const specials = getSpecialTarifs(fee);

      Object.keys(specials).forEach((key) => {
        const clean = key.trim();
        if (clean) names.add(clean);
      });
    });

    return Array.from(names);
  }, [selectedFeeModelId, selectedFeeRows]);

  useEffect(() => {
    if (!selectedFeeModelId) {
      if (selectedTarif) setSelectedTarif("");
      return;
    }

    if (selectedTarif && !availableTarifs.includes(selectedTarif)) {
      setSelectedTarif("");
    }
  }, [availableTarifs, selectedFeeModelId, selectedTarif]);

  useEffect(() => {
    if (!selectedFeeModelId || !selectedTarif) {
      setSelectedFeeIds([]);
      return;
    }

    setSelectedFeeIds(selectedFeeRows.map((fee, index) => getFeeRowStableId(fee, index)));
  }, [selectedFeeModelId, selectedTarif, selectedFeeRows]);

  const selectedFees = useMemo(
    () => selectedFeeRows.filter((fee, index) => selectedFeeIds.includes(getFeeRowStableId(fee, index))),
    [selectedFeeRows, selectedFeeIds]
  );

  const totalSelectedFees = useMemo(
    () =>
      selectedFees.reduce(
        (sum, fee) => sum + feeAmountByTarif(fee, selectedTarif),
        0
      ),
    [selectedFees, selectedTarif]
  );

  const progress = useMemo(() => {
    return Math.round(((step + 1) / steps.length) * 100);
  }, [step]);

  async function save() {
    if (
      !form.dateInscription ||
      !form.matricule ||
      !form.nom ||
      !form.prenoms ||
      !form.sexe ||
      !selectedSiteId ||
      !selectedLevelId ||
      !selectedClassId
    ) {
      alert("Fenoy aloha ireo champs misy *");
      return;
    }

    if (!selectedFeeModelId) {
      alert("Safidio aloha ny modèle de frais.");
      return;
    }

    if (!selectedTarif) {
      alert("Safidio aloha ny tarif ampiharina.");
      return;
    }

    try {
      setLoading(true);

      const yearRes = await fetch("/api/school-years/active", {
        cache: "no-store",
      });

      const activeYear = yearRes.ok
        ? await yearRes.json()
        : { name: academics.year || "2025-2026" };

      const activeYearName = activeYear.name || academics.year || "2025-2026";

      const res = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          siteId: Number(selectedSiteId),
          site: selectedSiteName,
          siteName: selectedSiteName,
          anneeScolaire: activeYearName,
          schoolYearName: activeYearName,
          levelId: Number(selectedLevelId),
          classRoomId: Number(selectedClassId),
          classId: Number(selectedClassId),
          niveau: selectedLevel?.name || form.niveau,
          classe: selectedClass?.name || form.classe,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erreur enregistrement");
        return;
      }

      const createdStudent = data.student || data.data || data;

      if (!createdStudent?.id) {
        alert("Étudiant enregistré, mais ID étudiant introuvable.");
        return;
      }

      if (selectedFees.length > 0) {
        const feeRows = selectedFees.map((fee, index) => {
          const amount = feeAmountByTarif(fee, selectedTarif);
          const stableId = getFeeRowStableId(fee, index);

          return {
            id: stableId,
            feeRowId: stableId,
            feeModelId: Number(selectedFeeModelId),
            sourceType: "FEE_MODEL",
            siteId: Number(selectedSiteId),
            site: selectedSiteName,
            siteName: selectedSiteName,
            code: fee.code || "",
            libelle: feeLabel(fee),
            label: feeLabel(fee),
            montant: amount,
            amount,
            tarifAmount: amount,
            montantTarifSelectionne: amount,
            montantChoisi: amount,
            montantApplique: amount,
            montantPaye: 0,
            reste: amount,
            status: "NON_PAYE",
            tarifName: selectedTarif,
            selectedTarif,
            tarifSelectionne: selectedTarif,
            appliedTarif: selectedTarif,
            appliedAmount: amount,
            selectedTarifAmount: amount,
            feeModelName: modelTitle(selectedFeeModelDetails),
            schoolYearName: activeYearName,
            anneeScolaire: activeYearName,
            classRoomId: Number(selectedClassId),
            classId: Number(selectedClassId),
            classe: selectedClass?.name || form.classe,
            className: selectedClass?.name || form.classe,
            section: form.section || "",
            serie: form.section || "",
            serieName: form.section || "",
          };
        });

        const feeRes = await fetch("/api/student-fees", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: createdStudent.id,
            siteId: Number(selectedSiteId),
            site: selectedSiteName,
            siteName: selectedSiteName,
            schoolYearName: activeYearName,
            anneeScolaire: activeYearName,
            tarifName: selectedTarif,
            selectedTarif,
            tarifSelectionne: selectedTarif,
            appliedTarif: selectedTarif,
            classRoomId: Number(selectedClassId),
            classId: Number(selectedClassId),
            classe: selectedClass?.name || form.classe,
            className: selectedClass?.name || form.classe,
            section: form.section || "",
            serie: form.section || "",
            serieName: form.section || "",
            feeModelId: Number(selectedFeeModelId),
            feeModelName: modelTitle(selectedFeeModelDetails),
            sourceType: "FEE_MODEL",
            modeCreation: "FEE_MODEL_TARIF_ROWS",
            feeRows,
            fees: feeRows,
            items: feeRows,
          }),
        });

        const feeData = await feeRes.json();

        if (!feeRes.ok) {
          alert(
            feeData.error ||
              "Étudiant enregistré, mais erreur liaison frais de formation."
          );
          return;
        }
      }

      alert("Inscription enregistrée avec succès !");
      window.location.href = `/user/student/${createdStudent.id}`;
    } catch {
      alert("Erreur serveur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex text-[13px] text-slate-900 overflow-hidden">
      <aside className="hidden lg:flex w-[245px] bg-slate-950/95 text-white flex-col border-r border-white/10 shadow-2xl">
        <div className="h-[76px] bg-white px-4 flex items-center border-b border-slate-200">
          <div>
            <div className="text-[22px] font-black text-red-600 leading-none tracking-tight">
              STRELITZIA
            </div>
            <div className="text-[14px] font-black text-green-600 tracking-[0.2em]">
              SCHOOL
            </div>
          </div>
        </div>

        <div className="bg-slate-900 px-4 py-4 flex gap-3 items-center border-b border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-300 to-yellow-500 flex items-center justify-center text-xl shadow-lg">
            👤
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate">{user.name}</p>
            <p className="text-[11px] text-blue-300">{user.role}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-2">
          <SideButton label="Tableau de bord" />
          <SideButton label="Étudiants" active />
          <SideButton label="Liste des inscrits" />
          <SideButton label="Inscrire un étudiant" active />
          <SideButton label="Réinscription" />
          <SideButton label="Paiement" />
          <SideButton label="Activités extras" />
          <SideButton label="Paramètres" />
        </nav>
      </aside>

      <section className="flex-1 overflow-y-auto">
        <div className="min-h-screen p-3 md:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[28px] bg-white/95 shadow-2xl overflow-hidden border border-white/50">
              <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-5 md:p-7">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div>
                    <p className="text-blue-200 font-bold text-xs uppercase tracking-[0.25em]">
                      Gestion scolaire
                    </p>
                    <h1 className="text-2xl md:text-4xl font-black mt-2">
                      Inscription étudiant
                    </h1>
                    <p className="text-blue-100 mt-2">
                      Année scolaire : <b>{academics.year || "2025-2026"}</b>
                      <span className="mx-2 text-blue-300">•</span>
                      Site : <b>{selectedSiteName || "Strelitzia School"}</b>
                    </p>
                  </div>

                  <div className="bg-white/10 border border-white/15 rounded-3xl px-5 py-4 min-w-[220px]">
                    <p className="text-[11px] text-blue-200">Progression</p>
                    <p className="text-2xl font-black">{progress}%</p>
                    <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-300 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 md:p-6 bg-slate-50">
                <StepHeader step={step} />

                <div className="mt-6">
                  {step === 0 && (
                    <Panel
                      icon="👨‍🎓"
                      title="Info sur l’étudiant"
                      subtitle="Informations personnelles et identité de l’élève."
                    >
                      <Grid>
                        <Input label="Date inscription *" type="date" value={form.dateInscription} onChange={(v: string) => update("dateInscription", v)} />
                        <Select
                          label="Site *"
                          value={selectedSiteId}
                          options={sites.map((site) => ({
                            label: site.name,
                            value: String(site.id),
                          }))}
                          onChange={(value: string) => {
                            const site = sites.find((s) => String(s.id) === value);

                            setSelectedSiteId(value);
                            setSelectedSiteName(site?.name || "Strelitzia School");

                            setFeeModels([]);
                            setSelectedFeeModelId("");
                            setSelectedFeeModelDetails(null);
                            setSelectedFeeIds([]);
                            setSelectedTarif("");
                          }}
                        />
                        <Input label="Matricule *" value={form.matricule} onChange={(v: string) => update("matricule", v)} />
                        <PhotoInput value={form.photoUrl} onChange={(v: string) => update("photoUrl", v)} />

                        <Input label="Nom *" value={form.nom} onChange={(v: string) => update("nom", v)} />
                        <Input label="Prénoms *" value={form.prenoms} onChange={(v: string) => update("prenoms", v)} />
                        <Select label="Sexe *" value={form.sexe} options={["Masculin", "Féminin"]} onChange={(v: string) => update("sexe", v)} />

                        <Input label="Date de naissance" type="date" value={form.dateNaissance} onChange={(v: string) => update("dateNaissance", v)} />
                        <Input label="Lieu de naissance" value={form.lieuNaissance} onChange={(v: string) => update("lieuNaissance", v)} />
                        <Input label="Téléphone" value={form.telephone} onChange={(v: string) => update("telephone", v)} />
                        <Input label="Adresse" value={form.adresse} onChange={(v: string) => update("adresse", v)} />
                        <Input label="Signe particulier" value={form.signeParticulier} onChange={(v: string) => update("signeParticulier", v)} />
                        <Input label="Maladie / Allergie" value={form.maladieAllergie} onChange={(v: string) => update("maladieAllergie", v)} />
                        <Input label="Email" value={form.email} onChange={(v: string) => update("email", v)} />
                      </Grid>
                    </Panel>
                  )}

                  {step === 1 && (
                    <Panel
                      icon="👨‍👩‍👧"
                      title="Info parents"
                      subtitle="Informations concernant le père, la mère et l’adresse familiale."
                    >
                      <Grid>
                        <Input label="Nom du père" value={form.pereNom} onChange={(v: string) => update("pereNom", v)} />
                        <Input label="Téléphone père" value={form.pereTel} onChange={(v: string) => update("pereTel", v)} />
                        <Input label="Nom de la mère" value={form.mereNom} onChange={(v: string) => update("mereNom", v)} />
                        <Input label="Téléphone mère" value={form.mereTel} onChange={(v: string) => update("mereTel", v)} />
                        <Input label="Adresse des parents" value={form.parentAdresse} onChange={(v: string) => update("parentAdresse", v)} />
                      </Grid>
                    </Panel>
                  )}

                  {step === 2 && (
                    <Panel
                      icon="🧑‍💼"
                      title="Tuteur"
                      subtitle="Personne responsable à contacter si besoin."
                    >
                      <Grid>
                        <Input label="Nom du tuteur" value={form.tuteurNom} onChange={(v: string) => update("tuteurNom", v)} />
                        <Input label="Lien avec l’étudiant" value={form.tuteurLien} onChange={(v: string) => update("tuteurLien", v)} />
                        <Input label="Téléphone tuteur" value={form.tuteurTel} onChange={(v: string) => update("tuteurTel", v)} />
                        <Input label="Adresse tuteur" value={form.tuteurAdresse} onChange={(v: string) => update("tuteurAdresse", v)} />
                      </Grid>
                    </Panel>
                  )}

                  {step === 3 && (
                    <Panel
                      icon="🎓"
                      title="Niveau & frais de formations"
                      subtitle="Choix du niveau, classe, série et frais liés à l’étudiant."
                    >
                      <Grid>
                        <Select
                          label="Niveau *"
                          value={selectedLevelId}
                          options={academics.levels.map((level) => ({
                            label: level.name,
                            value: String(level.id),
                          }))}
                          onChange={(value: string) => {
                            setSelectedLevelId(value);
                            setSelectedClassId("");
                            setFeeModels([]);
                            setSelectedFeeModelId("");
                            setSelectedFeeModelDetails(null);
                            setSelectedFeeIds([]);
                            setSelectedTarif("");

                            const level = academics.levels.find(
                              (l) => String(l.id) === value
                            );

                            update("niveau", level?.name || "");
                            update("classe", "");
                            update("section", "");
                          }}
                        />

                        <Select
                          label="Classe *"
                          value={selectedClassId}
                          options={(selectedLevel?.classes || []).map((classe) => ({
                            label: classe.name,
                            value: String(classe.id),
                          }))}
                          onChange={(value: string) => {
                            setSelectedClassId(value);
                            setSelectedFeeModelId("");
                            setSelectedFeeModelDetails(null);
                            setSelectedFeeIds([]);
                            setSelectedTarif("");

                            const classe = selectedLevel?.classes.find(
                              (c) => String(c.id) === value
                            );

                            update("classe", classe?.name || "");
                            update("section", "");
                          }}
                        />

                        <Select
                          label="Série / Section"
                          value={form.section}
                          options={(selectedClass?.series || []).map((serie) => serie.name)}
                          onChange={(v: string) => update("section", v)}
                        />
                      </Grid>

                      <div className="mt-6 rounded-[26px] border border-indigo-100 bg-white p-4 md:p-5 shadow-sm">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <Select
                            label="Modèle de frais *"
                            value={selectedFeeModelId}
                            options={feeModels.map((model) => ({
                              label: modelTitle(model),
                              value: String(model.id),
                            }))}
                            onChange={(value: string) => selectFeeModel(value)}
                          />

                          <Select
                            label="Choix tarif *"
                            value={selectedTarif}
                            options={availableTarifs}
                            onChange={(value: string) => setSelectedTarif(value)}
                          />
                        </div>

                        <div className="mt-4 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-900">
                          {selectedTarif
                            ? `${selectedFeeRows.length} frais prêts avec le tarif ${selectedTarif}`
                            : "Sélectionnez d’abord un tarif"}
                        </div>

                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          Safidio aloha ny modèle avy amin&apos;ny Fee Models, avy eo safidio ny tarif. Rehefa voafidy ny tarif dia miseho sy ampidirina automatique daholo ny frais ao anatiny.
                        </p>
                      </div>

                      <div className="mt-6 rounded-[26px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-5 shadow-sm">
                        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-base font-black text-slate-800">
                              Frais de formation à lier à l’étudiant
                            </h3>
                            <p className="text-xs text-slate-500">
                              Les frais du modèle sélectionné apparaissent seulement après choix du tarif.
                            </p>
                          </div>

                          <span className="w-fit rounded-full bg-blue-600 px-4 py-2 text-xs font-black text-white shadow">
                            {selectedTarif ? `${selectedFeeRows.length} frais du tarif ${selectedTarif}` : "Aucun tarif"}
                          </span>
                        </div>

                        {!selectedClassId ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center font-semibold text-slate-500">
                            Sélectionnez d’abord une classe pour afficher les modèles.
                          </div>
                        ) : !selectedFeeModelId ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center font-semibold text-slate-500">
                            Sélectionnez d'abord un modèle de frais.
                          </div>
                        ) : !selectedTarif ? (
                          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-center font-semibold text-indigo-700">
                            Sélectionnez d'abord un tarif pour afficher les frais du modèle.
                          </div>
                        ) : loadingModels || loadingFees ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center font-semibold text-slate-500">
                            Chargement des frais...
                          </div>
                        ) : selectedFeeModelId && selectedFeeRows.length === 0 ? (
                          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-center font-semibold text-orange-700">
                            Aucun modèle/frais créé pour cette classe.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {selectedFeeRows.map((fee, index) => {
                              const rowId = getFeeRowStableId(fee, index);
                              const checked = selectedFeeIds.includes(rowId);

                              return (
                                <button
                                  key={rowId}
                                  type="button"
                                  onClick={() => toggleFee(rowId)}
                                  className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                                    checked
                                      ? "border-blue-500 bg-white shadow-md ring-4 ring-blue-100"
                                      : "border-slate-200 bg-white/80 hover:border-blue-300 hover:bg-white"
                                  }`}
                                >
                                  <span
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${
                                      checked
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-slate-300 bg-white text-transparent"
                                    }`}
                                  >
                                    ✓
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-black text-slate-800">
                                      {feeLabel(fee)}
                                    </span>
                                    <span className="mt-1 block text-xs font-semibold text-slate-500">
                                      {fee.code || "-"} · {formatAmount(feeAmountByTarif(fee, selectedTarif))} Ar
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {academics.levels.length === 0 && (
                        <div className="mt-6 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <span className="font-semibold">
                            Aucun niveau/classe/série créé pour l’année active.
                          </span>
                          <button
                            onClick={() => (window.location.href = "/user/academics")}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-xl font-bold"
                          >
                            Créer maintenant
                          </button>
                        </div>
                      )}
                    </Panel>
                  )}

                  {step === 4 && (
                    <Panel
                      icon="🎨"
                      title="Activité"
                      subtitle="Activités extras et remarque générale."
                    >
                      <Grid>
                        <Select
                          label="Activité extras"
                          value={form.activite}
                          options={["Aucune", "Sport", "Danse", "Musique", "Informatique"]}
                          onChange={(v: string) => update("activite", v)}
                        />

                        <Textarea
                          label="Remarque"
                          value={form.remarque}
                          onChange={(v: string) => update("remarque", v)}
                        />
                      </Grid>
                    </Panel>
                  )}

                  {step === 5 && (
                    <Panel
                      icon="✅"
                      title="Validation"
                      subtitle="Vérifiez toutes les informations avant l’enregistrement."
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
                        <div className="bg-white rounded-3xl border p-5 shadow-sm">
                          {form.photoUrl ? (
                            <img
                              src={form.photoUrl}
                              alt="Photo étudiant"
                              className="w-full h-[260px] object-cover rounded-2xl border"
                            />
                          ) : (
                            <div className="w-full h-[260px] bg-slate-100 rounded-2xl border flex items-center justify-center text-6xl">
                              👤
                            </div>
                          )}

                          <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-800">
                            Site : {selectedSiteName || "Strelitzia School"}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <InfoBox label="Matricule" value={form.matricule} />
                            <InfoBox label="Année scolaire" value={academics.year || "2025-2026"} />
                            <InfoBox label="Site" value={selectedSiteName || "Strelitzia School"} />
                            <InfoBox label="Nom" value={form.nom} />
                            <InfoBox label="Prénom(s)" value={form.prenoms} />
                            <InfoBox label="Sexe" value={form.sexe} />
                            <InfoBox label="Classe" value={selectedClass?.name || form.classe} />
                            <InfoBox label="Série / Section" value={form.section || "-"} />
                            <InfoBox label="Téléphone" value={form.telephone || "-"} />
                            <InfoBox label="Activité" value={form.activite || "-"} />
                          </div>

                          <div className="rounded-3xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <h3 className="font-black text-slate-900">Frais liés à l’étudiant</h3>
                                <p className="text-xs font-semibold text-slate-500">
                                  Modèle : {modelTitle(selectedFeeModelDetails)} • Tarif : {selectedTarif || "-"}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                                Total : {formatAmount(totalSelectedFees)} Ar
                              </div>
                            </div>

                            <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                              {selectedFees.length === 0 ? (
                                <div className="p-4 text-center text-sm font-bold text-slate-500">
                                  Aucun frais sélectionné
                                </div>
                              ) : (
                                selectedFees.map((fee, index) => (
                                  <div key={getFeeRowStableId(fee, index)} className="flex items-center justify-between gap-3 p-3 text-sm">
                                    <span className="min-w-0">
                                      <b>{fee.code || "-"}</b> — {feeLabel(fee)}
                                    </span>
                                    <b className="shrink-0">{formatAmount(feeAmountByTarif(fee, selectedTarif))} Ar</b>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Panel>
                  )}

                  <div className="mt-8 flex flex-col md:flex-row justify-between gap-3">
                    <button
                      onClick={prev}
                      disabled={step === 0}
                      className="bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 px-5 py-3 rounded-2xl font-black shadow-sm"
                    >
                      ← Étape précédente
                    </button>

                    {step < steps.length - 1 ? (
                      <button
                        onClick={next}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-7 py-3 rounded-2xl font-black shadow-lg shadow-blue-700/30"
                      >
                        Étape suivante →
                      </button>
                    ) : (
                      <button
                        onClick={save}
                        disabled={loading}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-60 text-white px-7 py-3 rounded-2xl font-black shadow-lg shadow-green-700/30"
                      >
                        {loading ? "Enregistrement..." : "✅ Enregistrer l’inscription"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SideButton({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-2xl font-semibold transition ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
          : "hover:bg-white/10 text-slate-200"
      }`}
    >
      {active ? "● " : "- "} {label}
    </button>
  );
}

function StepHeader({ step }: { step: number }) {
  return (
    <div className="mt-7 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`rounded-2xl border p-4 transition-all ${
            i === step
              ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02]"
              : i < step
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-white text-slate-500 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                i === step
                  ? "bg-white text-slate-900"
                  : i < step
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <div className="min-w-0">
              <p className="text-lg leading-none">{stepIcons[i]}</p>
              <p className="font-black text-[12px] truncate mt-1">{s}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[26px] border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-slate-900 to-blue-900 text-white flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="text-blue-100 text-sm mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="p-5 md:p-7">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-slate-600 font-bold text-[12px]">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 transition"
      />
    </label>
  );
}

function PhotoInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-slate-600 font-bold text-[12px]">Photo étudiant</span>

      <div className="mt-2 flex flex-col md:flex-row items-start md:items-center gap-5 bg-slate-50 border border-slate-200 rounded-3xl p-4">
        {value ? (
          <img
            src={value}
            alt="Photo étudiant"
            className="w-28 h-32 object-cover rounded-2xl border shadow-sm"
          />
        ) : (
          <div className="w-28 h-32 bg-white rounded-2xl border flex items-center justify-center text-4xl shadow-sm">
            👤
          </div>
        )}

        <div className="flex-1 w-full">
          <p className="font-bold text-slate-700">Importer une photo</p>
          <p className="text-slate-500 text-xs mb-3">
            Format image accepté. La photo sera enregistrée avec la fiche.
          </p>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              const reader = new FileReader();

              reader.onloadend = () => {
                onChange(String(reader.result));
              };

              reader.readAsDataURL(file);
            }}
            className="w-full border border-slate-200 bg-white rounded-2xl px-4 py-3 file:mr-4 file:border-0 file:bg-blue-600 file:text-white file:px-4 file:py-2 file:rounded-xl file:font-bold"
          />
        </div>
      </div>
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: OptionType[];
}) {
  return (
    <label className="block">
      <span className="text-slate-600 font-bold text-[12px]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
      >
        <option value="">-- Choisir --</option>

        {options.map((op) => {
          const optionValue = typeof op === "string" ? op : op.value;
          const optionLabel = typeof op === "string" ? op : op.label;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-slate-600 font-bold text-[12px]">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="mt-2 w-full bg-white border border-slate-200 rounded-2xl p-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
      />
    </label>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-900">{value || "-"}</p>
    </div>
  );
}
