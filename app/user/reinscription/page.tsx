"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Student = {
  id: number;
  siteId?: number | null;
  site?: string | null;
  matricule: string;
  photoUrl?: string | null;
  nom: string;
  prenoms: string;
  sexe: string;
  classe: string;
  section: string;
  anneeScolaire: string;
  contact?: string | null;
  adresse?: string | null;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  signeParticulier?: string | null;
  maladieAllergie?: string | null;
  email?: string | null;
  pereNom?: string | null;
  pereTel?: string | null;
  mereNom?: string | null;
  mereTel?: string | null;
  parentAdresse?: string | null;
  tuteurNom?: string | null;
  tuteurLien?: string | null;
  tuteurTel?: string | null;
  tuteurAdresse?: string | null;
  niveau?: string | null;
};

type Site = {
  id: number;
  name: string;
  code?: string | null;
  active?: boolean;
};

type SchoolYear = { id: number; name: string; active: boolean };
type Serie = { id: number; name: string; classRoomId: number; schoolYearName: string };
type ClassRoom = { id: number; name: string; schoolYearName: string; series: Serie[] };

type TarifsSpeciaux = Record<string, number | string | null | undefined>;

type FeeSpecialTariff = {
  id?: number;
  feeTariffId?: number;
  name: string;
  amount: number | string;
};

type TrainingFee = {
  id: number;
  siteId?: number | string | null;
  libelle?: string | null;
  label?: string | null;
  name?: string | null;
  code?: string | null;
  montant?: number | string | null;
  montantPrincipal?: number | string | null;
  amount?: number | string | null;
  classe?: string | null;
  classRoomName?: string | null;
  section?: string | null;
  serie?: string | null;
  serieName?: string | null;
  schoolYearName?: string | null;
  anneeScolaire?: string | null;
  specials?: TarifsSpeciaux | FeeSpecialTariff[] | string | null;
  tarifsSpeciaux?: TarifsSpeciaux | string | null;
};

type FeeTariff = {
  id: number;
  siteId?: number | string | null;
  feeModelId?: number;
  libelle?: string | null;
  label?: string | null;
  name?: string | null;
  code?: string | null;
  montant?: number | string | null;
  amount?: number | string | null;
  specials?: FeeSpecialTariff[] | TarifsSpeciaux | string | null;
  tarifsSpeciaux?: TarifsSpeciaux | string | null;
};

type FeeModel = {
  id: number;
  siteId?: number | string | null;
  title?: string | null;
  name?: string | null;
  libelle?: string | null;
  classe?: string | null;
  classRoomName?: string | null;
  schoolYearName?: string | null;
  anneeScolaire?: string | null;
  tariffs?: FeeTariff[];
  fees?: FeeTariff[];
};

type FormData = {
  matricule: string;
  nom: string;
  prenoms: string;
  sexe: string;
  anneeScolaire: string;
  classe: string;
  section: string;
  contact: string;
  dateNaissance: string;
  lieuNaissance: string;
  adresse: string;
  signeParticulier: string;
  maladieAllergie: string;
  email: string;
  pereNom: string;
  pereTel: string;
  mereNom: string;
  mereTel: string;
  parentAdresse: string;
  tuteurNom: string;
  tuteurLien: string;
  tuteurTel: string;
  tuteurAdresse: string;
  niveau: string;
  fraisInscription: string;
  reinscriptionFeeId: string;
  fraisReinscriptionLibelle: string;
  fraisReinscriptionDetails: string;
  fraisScolarite: string;
  tarifReinscription: string;
  trainingFeeIds: string;
  trainingFeesTotal: string;
  trainingFeesDetails: string;
  activite: string;
  remarque: string;
};

const emptyForm: FormData = {
  matricule: "",
  nom: "",
  prenoms: "",
  sexe: "Masculin",
  anneeScolaire: "",
  classe: "",
  section: "",
  contact: "",
  dateNaissance: "",
  lieuNaissance: "",
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
  fraisInscription: "",
  reinscriptionFeeId: "",
  fraisReinscriptionLibelle: "",
  fraisReinscriptionDetails: "",
  fraisScolarite: "",
  tarifReinscription: "",
  trainingFeeIds: "",
  trainingFeesTotal: "",
  trainingFeesDetails: "",
  activite: "",
  remarque: "",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Chargement...</div>}>
      <ReinscriptionPage />
    </Suspense>
  );
}

function ReinscriptionPage() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId");

  const [step, setStep] = useState(1);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [classRooms, setClassRooms] = useState<ClassRoom[]>([]);
  const [trainingFees, setTrainingFees] = useState<TrainingFee[]>([]);
  const [feeModels, setFeeModels] = useState<FeeModel[]>([]);
  const [selectedFeeIds, setSelectedFeeIds] = useState<number[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedSite = useMemo(
    () => sites.find((site) => String(site.id) === String(selectedSiteId)) || null,
    [sites, selectedSiteId]
  );

  const selectedSiteName = selectedSite?.name || "Strelitzia School";
  const selectedSiteCode = selectedSite?.code || "";

  const classes = useMemo(
    () => classRooms.filter((c) => c.schoolYearName === form.anneeScolaire),
    [classRooms, form.anneeScolaire]
  );

  const series = useMemo(() => {
    const selectedClass = classes.find((c) => c.name === form.classe);
    return selectedClass?.series?.filter((s) => s.schoolYearName === form.anneeScolaire) || [];
  }, [classes, form.classe, form.anneeScolaire]);

  const selectedFeeModel = useMemo(() => {
    const id = Number(form.reinscriptionFeeId || 0);
    return feeModels.find((model) => model.id === id) || null;
  }, [feeModels, form.reinscriptionFeeId]);

  const selectedFeeModelTariffs = useMemo(() => {
    if (!selectedFeeModel) return [] as TrainingFee[];

    const rows = selectedFeeModel.tariffs || selectedFeeModel.fees || [];

    return rows.map((tariff) => ({
      id: tariff.id,
      siteId: tariff.siteId || selectedFeeModel.siteId || null,
      libelle: tariff.libelle || tariff.label || tariff.name || "Frais",
      label: tariff.label || tariff.libelle || tariff.name || "Frais",
      name: tariff.name || tariff.libelle || tariff.label || "Frais",
      code: tariff.code || "",
      montant: tariff.montant ?? tariff.amount ?? 0,
      amount: tariff.amount ?? tariff.montant ?? 0,
      specials: normalizeModelSpecials(tariff.specials),
      tarifsSpeciaux: tariff.tarifsSpeciaux || null,
      schoolYearName: selectedFeeModel.schoolYearName || selectedFeeModel.anneeScolaire || form.anneeScolaire,
      classe: selectedFeeModel.classe || selectedFeeModel.classRoomName || form.classe,
    }));
  }, [selectedFeeModel, form.anneeScolaire, form.classe]);

  const availableTarifs = useMemo(() => {
    const names = new Set<string>(["Principal"]);

    selectedFeeModelTariffs.forEach((fee) => {
      const specials = getSpecialTarifs(fee);
      Object.keys(specials).forEach((key) => {
        const clean = key.trim();
        if (clean) names.add(clean);
      });
    });

    return Array.from(names);
  }, [selectedFeeModelTariffs]);

  const selectedFeeModelTariffsForSelectedTarif = useMemo(() => {
    if (!form.tarifReinscription) return [] as TrainingFee[];

    return selectedFeeModelTariffs.filter((fee) =>
      hasAmountForTarif(fee, form.tarifReinscription)
    );
  }, [selectedFeeModelTariffs, form.tarifReinscription]);

  const selectedTrainingFees = useMemo(
    () => trainingFees.filter((fee) => selectedFeeIds.includes(fee.id)),
    [trainingFees, selectedFeeIds]
  );

  const fraisReinscriptionAmount = useMemo(
    () =>
      selectedFeeModelTariffsForSelectedTarif.reduce(
        (sum, fee) => sum + getFeeAmountByTarif(fee, form.tarifReinscription),
        0
      ),
    [selectedFeeModelTariffsForSelectedTarif, form.tarifReinscription]
  );

  const totalTrainingFees = useMemo(
    () =>
      selectedTrainingFees.reduce(
        (sum, fee) => sum + getFeeAmountByTarif(fee, form.tarifReinscription || "Principal"),
        0
      ),
    [selectedTrainingFees, form.tarifReinscription]
  );

  function update(name: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function loadSites() {
    try {
      const savedSiteId =
        typeof window !== "undefined"
          ? localStorage.getItem("strelitzia-selected-site-id") || ""
          : "";

      const res = await fetch(`/api/sites?_ts=${Date.now()}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      const list: Site[] = Array.isArray(data?.sites) ? data.sites : [];

      setSites(list);

      const savedSite = list.find((site) => String(site.id) === savedSiteId && site.active !== false);
      const firstActive = list.find((site) => site.active !== false) || list[0];
      const siteToUse = savedSite || firstActive;

      if (siteToUse) {
        const nextSiteId = String(siteToUse.id);
        setSelectedSiteId(nextSiteId);

        if (typeof window !== "undefined") {
          localStorage.setItem("strelitzia-selected-site-id", nextSiteId);
        }

        return nextSiteId;
      }

      return "";
    } catch {
      setSites([]);
      return "";
    }
  }

  async function loadTrainingFees() {
    if (!form.anneeScolaire || !form.classe) {
      setTrainingFees([]);
      setSelectedFeeIds([]);
      setForm((prev) => ({
        ...prev,
        reinscriptionFeeId: "",
        fraisInscription: "",
        fraisReinscriptionLibelle: "",
        fraisReinscriptionDetails: "",
      }));
      return;
    }

    setFeesLoading(true);

    try {
      const params = new URLSearchParams({
        schoolYearName: form.anneeScolaire,
        anneeScolaire: form.anneeScolaire,
        classe: form.classe,
        classRoomName: form.classe,
      });

      if (selectedSiteId) {
        params.set("siteId", selectedSiteId);
        params.set("site", selectedSiteName);
        if (selectedSiteCode) params.set("siteCode", selectedSiteCode);
      }

      if (form.section) {
        params.set("section", form.section);
        params.set("serie", form.section);
        params.set("serieName", form.section);
      }

      const res = await fetch(`/api/training-fees?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      const rawFees: TrainingFee[] = Array.isArray(data) ? data : data.trainingFees || data.fees || [];

      const filtered = rawFees.filter((fee) => {
        const sameYear = !fee.schoolYearName && !fee.anneeScolaire ? true : (fee.schoolYearName || fee.anneeScolaire) === form.anneeScolaire;
        const sameClass = !fee.classe && !fee.classRoomName ? true : (fee.classe || fee.classRoomName) === form.classe;
        const feeSerie = fee.section || fee.serie || fee.serieName || "";
        const sameSerie = !form.section || !feeSerie || feeSerie === form.section;
        const feeSiteId = fee.siteId ? String(fee.siteId) : "";
        const sameSite = !selectedSiteId || !feeSiteId || feeSiteId === String(selectedSiteId);
        return sameYear && sameClass && sameSerie && sameSite;
      });

      setTrainingFees(filtered);
      setSelectedFeeIds(filtered.map((fee) => fee.id));
    } catch {
      setTrainingFees([]);
      setSelectedFeeIds([]);
      setMessage("Impossible de charger les frais de formation de cette classe.");
    } finally {
      setFeesLoading(false);
    }
  }

  async function loadFeeModels() {
    if (!form.anneeScolaire || !form.classe) {
      setFeeModels([]);
      setForm((prev) => ({
        ...prev,
        reinscriptionFeeId: "",
        fraisInscription: "",
        fraisReinscriptionLibelle: "",
        fraisReinscriptionDetails: "",
        tarifReinscription: "",
      }));
      return;
    }

    try {
      const params = new URLSearchParams({
        schoolYearName: form.anneeScolaire,
        anneeScolaire: form.anneeScolaire,
        classe: form.classe,
        classRoomName: form.classe,
      });

      if (selectedSiteId) {
        params.set("siteId", selectedSiteId);
        params.set("site", selectedSiteName);
        if (selectedSiteCode) params.set("siteCode", selectedSiteCode);
      }

      const res = await fetch(`/api/fee-models?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      const rawModels: FeeModel[] = Array.isArray(data) ? data : data.models || data.feeModels || [];

      const filtered = rawModels.filter((model) => {
        const modelYear = model.schoolYearName || model.anneeScolaire || "";
        const modelClass = model.classe || model.classRoomName || "";
        const modelSiteId = model.siteId ? String(model.siteId) : "";
        const sameYear = !modelYear || modelYear === form.anneeScolaire;
        const sameClass = !modelClass || modelClass === "GENERAL" || modelClass === form.classe;
        const sameSite = !selectedSiteId || !modelSiteId || modelSiteId === String(selectedSiteId);
        return sameYear && sameClass && sameSite;
      });

      setFeeModels(filtered);

      setForm((prev) => {
        const currentStillExists = filtered.some((model) => String(model.id) === prev.reinscriptionFeeId);
        const defaultModel = currentStillExists ? prev.reinscriptionFeeId : String(findBestFeeModel(filtered)?.id || "");
        return {
          ...prev,
          reinscriptionFeeId: defaultModel,
          tarifReinscription: currentStillExists ? prev.tarifReinscription : "",
        };
      });
    } catch {
      setFeeModels([]);
      setMessage("Impossible de charger les modèles de frais créés dans fee-models.");
    }
  }

  function toggleTrainingFee(id: number) {
    setSelectedFeeIds((prev) =>
      prev.includes(id) ? prev.filter((feeId) => feeId !== id) : [...prev, id]
    );
  }

  async function loadOptions() {
    try {
      const res = await fetch("/api/reinscription/options");
      const data = await res.json();

      const years: SchoolYear[] = data.schoolYears || [];
      const rooms: ClassRoom[] = data.classRooms || [];
      const active =
        data.activeYear || years.find((y) => y.active)?.name || years[0]?.name || "";

      setSchoolYears(years);
      setClassRooms(rooms);
      setForm((p) => ({ ...p, anneeScolaire: active }));
    } catch {
      setMessage("Erreur chargement des années scolaires.");
    }
  }

  async function searchStudents(value: string) {
    setQ(value);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    try {
      const params = new URLSearchParams({ q: value });
      if (selectedSiteId) params.set("siteId", selectedSiteId);

      const res = await fetch(`/api/students/search?${params.toString()}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setMessage("Erreur recherche étudiant.");
    }
  }

  async function loadInitialStudent(id: string) {
    try {
      const params = new URLSearchParams({ studentId: id });
      if (selectedSiteId) params.set("siteId", selectedSiteId);

      const res = await fetch(`/api/students/search?${params.toString()}`);
      const data = await res.json();
      const found = Array.isArray(data) ? data[0] : null;

      if (found) selectStudent(found);
    } catch {
      setMessage("Impossible de charger l’étudiant.");
    }
  }

  function selectStudent(s: Student) {
    setSelected(s);
    setQ(`${s.matricule} - ${s.nom} ${s.prenoms}`);
    setResults([]);
    setMessage("");

    setForm((p) => ({
      ...p,
      matricule: s.matricule || "",
      nom: s.nom || "",
      prenoms: s.prenoms || "",
      sexe: s.sexe || "Masculin",
      contact: s.contact || "",
      dateNaissance: toInputDate(s.dateNaissance),
      lieuNaissance: s.lieuNaissance || "",
      adresse: s.adresse || "",
      signeParticulier: s.signeParticulier || "",
      maladieAllergie: s.maladieAllergie || "",
      email: s.email || "",
      pereNom: s.pereNom || "",
      pereTel: s.pereTel || "",
      mereNom: s.mereNom || "",
      mereTel: s.mereTel || "",
      parentAdresse: s.parentAdresse || "",
      tuteurNom: s.tuteurNom || "",
      tuteurLien: s.tuteurLien || "",
      tuteurTel: s.tuteurTel || "",
      tuteurAdresse: s.tuteurAdresse || "",
      niveau: s.niveau || "",
    }));
  }

  useEffect(() => {
    loadOptions();
    loadSites();
  }, []);

  useEffect(() => {
    if (initialStudentId) loadInitialStudent(initialStudentId);
  }, [initialStudentId, selectedSiteId]);

  useEffect(() => {
    setForm((p) => ({ ...p, classe: "", section: "" }));
  }, [form.anneeScolaire]);

  useEffect(() => {
    setForm((p) => ({
      ...p,
      section: "",
      tarifReinscription: "",
      reinscriptionFeeId: "",
      fraisInscription: "",
      fraisReinscriptionLibelle: "",
      fraisReinscriptionDetails: "",
    }));
  }, [form.classe]);

  useEffect(() => {
    if (!selectedSiteId) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("strelitzia-selected-site-id", selectedSiteId);
    }

    setResults([]);
    setSelected(null);
    setQ("");
    setSelectedFeeIds([]);
    loadTrainingFees();
    loadFeeModels();
  }, [selectedSiteId]);

  useEffect(() => {
    loadTrainingFees();
    loadFeeModels();
  }, [form.anneeScolaire, form.classe, form.section, selectedSiteId]);

  useEffect(() => {
    if (!form.tarifReinscription) return;

    if (!availableTarifs.includes(form.tarifReinscription)) {
      setForm((p) => ({ ...p, tarifReinscription: "" }));
    }
  }, [availableTarifs, form.tarifReinscription]);

  useEffect(() => {
    const model = selectedFeeModel;

    if (!model || !form.tarifReinscription) {
      setForm((p) => ({
        ...p,
        fraisInscription: "",
        fraisReinscriptionLibelle: model ? getFeeModelTitle(model) : "",
        fraisReinscriptionDetails: "",
      }));
      return;
    }

    const rows = selectedFeeModelTariffsForSelectedTarif.map((fee) => ({
      id: fee.id,
      trainingFeeId: fee.id,
      sourceTrainingFeeId: fee.id,
      siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
      site: selectedSiteName,
      siteName: selectedSiteName,
      siteCode: selectedSiteCode || undefined,
      code: fee.code || "",
      libelle: getFeeLabel(fee),
      tarif: form.tarifReinscription,
      montant: getFeeAmountByTarif(fee, form.tarifReinscription),
      montantTotal: getFeeAmountByTarif(fee, form.tarifReinscription),
      amount: getFeeAmountByTarif(fee, form.tarifReinscription),
    }));

    const detail = {
      modelId: model.id,
      modelTitle: getFeeModelTitle(model),
      tarif: form.tarifReinscription,
      total: fraisReinscriptionAmount,
      siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
      site: selectedSiteName,
      rows,
    };

    setForm((p) => ({
      ...p,
      fraisInscription: fraisReinscriptionAmount ? String(fraisReinscriptionAmount) : "",
      fraisScolarite: fraisReinscriptionAmount ? String(fraisReinscriptionAmount) : "",
      trainingFeeIds: "",
      trainingFeesTotal: fraisReinscriptionAmount ? String(fraisReinscriptionAmount) : "",
      trainingFeesDetails: JSON.stringify(rows),
      fraisReinscriptionLibelle: getFeeModelTitle(model),
      fraisReinscriptionDetails: JSON.stringify(detail),
    }));
  }, [
    selectedFeeModel,
    selectedFeeModelTariffsForSelectedTarif,
    fraisReinscriptionAmount,
    form.tarifReinscription,
    selectedSiteId,
    selectedSiteName,
    selectedSiteCode,
  ]);

  useEffect(() => {
    if (selectedFeeModel && form.tarifReinscription) return;

    const details = selectedTrainingFees.map((fee) => ({
      id: fee.id,
      siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
      site: selectedSiteName,
      code: fee.code || "",
      libelle: getFeeLabel(fee),
      tarif: form.tarifReinscription || "Principal",
      montant: getFeeAmountByTarif(fee, form.tarifReinscription || "Principal"),
    }));

    setForm((p) => ({
      ...p,
      fraisScolarite: totalTrainingFees ? String(totalTrainingFees) : "",
      trainingFeeIds: selectedFeeIds.join(","),
      trainingFeesTotal: totalTrainingFees ? String(totalTrainingFees) : "",
      trainingFeesDetails: JSON.stringify(details),
    }));
  }, [
    selectedFeeModel,
    selectedTrainingFees,
    selectedFeeIds,
    totalTrainingFees,
    form.tarifReinscription,
    selectedSiteId,
    selectedSiteName,
  ]);

  function validateStep() {
    setMessage("");

    if (step === 1) {
      if (!selectedSiteId) {
        setMessage("Veuillez sélectionner le site de réinscription.");
        return false;
      }

      if (!selected) {
        setMessage("Veuillez choisir un étudiant.");
        return false;
      }

      if (!form.matricule || !form.nom || !form.prenoms) {
        setMessage("Matricule, nom et prénoms obligatoires.");
        return false;
      }
    }

    if (step === 2) {
      if (!form.anneeScolaire || !form.classe || !form.section) {
        setMessage("Année scolaire, classe et série obligatoires.");
        return false;
      }

      if (selected?.anneeScolaire === form.anneeScolaire) {
        setMessage("Choisissez une année scolaire différente de l’ancienne.");
        return false;
      }

      if (feeModels.length > 0 && !form.reinscriptionFeeId) {
        setMessage("Veuillez sélectionner le modèle de frais de réinscription créé dans fee-models.");
        return false;
      }

      if (form.reinscriptionFeeId && !form.tarifReinscription) {
        setMessage("Veuillez choisir le tarif à appliquer pour la réinscription.");
        return false;
      }
    }

    return true;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((s) => Math.min(4, s + 1));
  }

  function buildReinscriptionStudentFeeRows() {
    const selectedTarif = form.tarifReinscription || "Principal";

    if (selectedFeeModel && selectedTarif) {
      return selectedFeeModelTariffsForSelectedTarif
        .map((fee) => {
          const amount = getFeeAmountByTarif(fee, selectedTarif);

          return {
            id: fee.id,
            sourceTrainingFeeId: fee.id,
            siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
            site: selectedSiteName,
            siteName: selectedSiteName,
            siteCode: selectedSiteCode || undefined,
            code: fee.code || "",
            libelle: getFeeLabel(fee),
            tarif: selectedTarif,
            feeModelId: selectedFeeModel.id,
            feeModelTitle: getFeeModelTitle(selectedFeeModel),
            montant: amount,
            montantTotal: amount,
            amount,
          };
        })
        .filter((row) => Number(row.montantTotal) > 0);
    }

    return selectedTrainingFees
      .map((fee) => {
        const amount = getFeeAmountByTarif(fee, selectedTarif);

        return {
          id: fee.id,
          trainingFeeId: fee.id,
          sourceTrainingFeeId: fee.id,
          siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
          site: selectedSiteName,
          siteName: selectedSiteName,
          siteCode: selectedSiteCode || undefined,
          code: fee.code || "",
          libelle: getFeeLabel(fee),
          tarif: selectedTarif,
          montant: amount,
          montantTotal: amount,
          amount,
        };
      })
      .filter((row) => Number(row.montantTotal) > 0);
  }

  async function createStudentFeesFromSelectedTarif(newStudentId: number | string) {
    const rows = buildReinscriptionStudentFeeRows();
    if (!newStudentId || rows.length === 0) return;

    const schoolYearName = form.anneeScolaire || "2025-2026";
    const selectedTarif = form.tarifReinscription || "Principal";
    const modelId = selectedFeeModel?.id || "NO_MODEL";

    const feesPayload = rows
      .map((row: any) => {
        const amount = Number(row.montantTotal || row.montant || row.amount || 0);
        if (!amount || amount <= 0) return null;

        return {
          trainingFeeId: "trainingFeeId" in row ? row.trainingFeeId || undefined : undefined,
          sourceTrainingFeeId:
            row.sourceTrainingFeeId ||
            ("trainingFeeId" in row ? row.trainingFeeId : undefined) ||
            row.id ||
            undefined,
          feeModelId:
            "feeModelId" in row
              ? row.feeModelId || selectedFeeModel?.id || undefined
              : selectedFeeModel?.id || undefined,
          feeModelTitle:
            "feeModelTitle" in row
              ? row.feeModelTitle || (selectedFeeModel ? getFeeModelTitle(selectedFeeModel) : "")
              : selectedFeeModel
                ? getFeeModelTitle(selectedFeeModel)
                : "",
          siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
          site: selectedSiteName,
          siteName: selectedSiteName,
          siteCode: selectedSiteCode || undefined,
          code: row.code || row.libelle || "FRAIS",
          libelle: row.libelle || row.code || "Frais de formation",
          montant: amount,
          amount,
          montantTotal: amount,
          reste: amount,
          montantPaye: 0,
          tarifName: selectedTarif,
          tarifReinscription: selectedTarif,
          selectedTarif,
          appliedTarif: selectedTarif,
          selectedTarifAmount: amount,
          appliedAmount: amount,
          montantTarifSelectionne: amount,
          montantChoisi: amount,
          montantApplique: amount,
          status: "NON_PAYE",
          statut: "NON_PAYE",
          paid: false,
          isPaid: false,
          schoolYearName,
          anneeScolaire: schoolYearName,
          classe: form.classe,
          className: form.classe,
          classRoomName: form.classe,
          section: form.section,
          serie: form.section,
          serieName: form.section,
          source: "REINSCRIPTION",
        };
      })
      .filter(Boolean);

    if (feesPayload.length === 0) {
      throw new Error("Aucun frais valide trouvé pour le tarif sélectionné.");
    }

    const idempotencyKey = [
      "REINSCRIPTION_STUDENT_FEES_ROWS",
      newStudentId,
      modelId,
      selectedTarif,
      schoolYearName,
      selectedSiteId,
    ]
      .map((item) => String(item ?? "").trim())
      .join("|");

    const feeRes = await fetch("/api/student-fees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        idempotencyKey,
        studentId: newStudentId,
        action: "SYNC_REINSCRIPTION",
        source: "REINSCRIPTION",
        siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
        site: selectedSiteName,
        siteName: selectedSiteName,
        siteCode: selectedSiteCode || undefined,
        schoolYearName,
        anneeScolaire: schoolYearName,
        classe: form.classe,
        className: form.classe,
        classRoomName: form.classe,
        section: form.section,
        serie: form.section,
        serieName: form.section,
        feeModelId: selectedFeeModel?.id || undefined,
        feeModelTitle: selectedFeeModel ? getFeeModelTitle(selectedFeeModel) : "",
        tarifName: selectedTarif,
        tarifReinscription: selectedTarif,
        selectedTarif,
        appliedTarif: selectedTarif,
        fees: feesPayload,
      }),
    });

    if (!feeRes.ok) {
      const errorData = await feeRes.json().catch(() => ({}));
      throw new Error(
        errorData?.message ||
          errorData?.error ||
          "Impossible de synchroniser les frais du tarif sélectionné."
      );
    }
  }

  async function submitReinscription() {
    if (!validateStep()) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/students/reinscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selected?.id,
          siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
          site: selectedSiteName,
          siteName: selectedSiteName,
          siteCode: selectedSiteCode || undefined,
          data: {
            ...form,
            siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
            site: selectedSiteName,
            siteName: selectedSiteName,
            siteCode: selectedSiteCode || undefined,
            tarifReinscription: form.tarifReinscription,
            fraisInscription: fraisReinscriptionAmount ? String(fraisReinscriptionAmount) : form.fraisInscription,
            fraisScolarite: fraisReinscriptionAmount ? String(fraisReinscriptionAmount) : form.fraisScolarite,
            trainingFeesTotal: fraisReinscriptionAmount ? String(fraisReinscriptionAmount) : form.trainingFeesTotal,
            trainingFeeIds: selectedFeeModel ? "" : form.trainingFeeIds,
            trainingFeesDetails: selectedFeeModel
              ? JSON.stringify(buildReinscriptionStudentFeeRows())
              : form.trainingFeesDetails,
            fraisReinscriptionDetails: selectedFeeModel
              ? JSON.stringify({
                  modelId: selectedFeeModel.id,
                  modelTitle: getFeeModelTitle(selectedFeeModel),
                  tarif: form.tarifReinscription,
                  total: fraisReinscriptionAmount,
                  siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
                  site: selectedSiteName,
                  rows: buildReinscriptionStudentFeeRows(),
                })
              : form.fraisReinscriptionDetails,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || data.error || "Erreur pendant la réinscription.");
        return;
      }

      const newStudent = data.student || data;
      const newStudentId = newStudent?.id;

      await createStudentFeesFromSelectedTarif(newStudentId);

      window.location.href = `/user/student/${newStudentId}`;
    } catch (error: any) {
      setMessage(error?.message || "Erreur serveur pendant la réinscription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full min-w-0 bg-slate-100">
      <div className="p-3 sm:p-5">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[24px] border bg-white shadow-xl">
            <div className="bg-slate-950 px-4 py-5 text-white sm:px-6">
              <h1 className="text-xl font-black sm:text-2xl">Réinscription étudiant</h1>
              <p className="mt-1 text-xs text-slate-300">
                Réinscription séparée par site et année scolaire.
              </p>
            </div>

            <div className="border-b bg-white px-4 py-4">
              <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-black sm:grid-cols-4">
                <StepBadge active={step >= 1} label="Info étudiant" />
                <StepBadge active={step >= 2} label="Niveau & Frais" />
                <StepBadge active={step >= 3} label="Activité" />
                <StepBadge active={step >= 4} label="C’est prêt" />
              </div>
            </div>

            <div className="p-4 lg:p-6">
              {step === 1 && (
                <div className="space-y-4">
                  <Card title="Site de réinscription">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block text-xs font-black text-slate-700">
                        Site
                        <select
                          value={selectedSiteId}
                          onChange={(e) => setSelectedSiteId(e.target.value)}
                          className="mt-1 w-full rounded-xl border px-3 py-3 text-sm font-bold"
                        >
                          {sites.length === 0 && <option value="">Aucun site disponible</option>}
                          {sites.map((site) => (
                            <option key={site.id} value={site.id}>
                              {site.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="rounded-xl border bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
                        <div className="text-xs font-black uppercase text-slate-400">Site sélectionné</div>
                        <div className="mt-1 text-slate-950">{selectedSiteName}</div>
                      </div>
                    </div>

                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      La réinscription et les frais créés seront rattachés à ce site.
                    </p>
                  </Card>

                  <SearchBox
                    q={q}
                    setQ={searchStudents}
                    results={results}
                    selectStudent={selectStudent}
                  />

                  {selected && (
                    <div className="rounded-2xl border bg-slate-50 p-4 shadow-sm">
                      <div className="flex flex-col items-center gap-4 sm:flex-row sm:text-left">
                        <StudentPhoto student={selected} />

                        <div className="text-center sm:text-left">
                          <div className="text-lg font-black text-slate-900">
                            {selected.nom} {selected.prenoms}
                          </div>
                          <div className="text-xs font-bold text-slate-500">
                            {selected.matricule} • Ancien site : {selected.site || "-"} • Nouveau site : {selectedSiteName} • {selected.anneeScolaire} • {selected.classe} • {selected.section}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Card title="Info sur l'étudiant">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input label="Matricule" value={form.matricule} onChange={(v) => update("matricule", v)} />
                      <Input label="Nom" value={form.nom} onChange={(v) => update("nom", v)} />
                      <Input label="Prénoms" value={form.prenoms} onChange={(v) => update("prenoms", v)} />
                      <SelectSimple label="Sexe" value={form.sexe} onChange={(v) => update("sexe", v)} options={["Masculin", "Feminin"]} />
                      <Input label="Contact" value={form.contact} onChange={(v) => update("contact", v)} />
                      <Input label="Email" value={form.email} onChange={(v) => update("email", v)} />
                      <Input label="Date naissance" type="date" value={form.dateNaissance} onChange={(v) => update("dateNaissance", v)} />
                      <Input label="Lieu naissance" value={form.lieuNaissance} onChange={(v) => update("lieuNaissance", v)} />
                      <Input label="Adresse" value={form.adresse} onChange={(v) => update("adresse", v)} />
                      <Input label="Signe particulier" value={form.signeParticulier} onChange={(v) => update("signeParticulier", v)} />
                      <Input label="Maladie / Allergie" value={form.maladieAllergie} onChange={(v) => update("maladieAllergie", v)} />
                    </div>
                  </Card>

                  <Card title="Parents / Tuteur">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input label="Nom père" value={form.pereNom} onChange={(v) => update("pereNom", v)} />
                      <Input label="Téléphone père" value={form.pereTel} onChange={(v) => update("pereTel", v)} />
                      <Input label="Nom mère" value={form.mereNom} onChange={(v) => update("mereNom", v)} />
                      <Input label="Téléphone mère" value={form.mereTel} onChange={(v) => update("mereTel", v)} />
                      <Input label="Adresse parent" value={form.parentAdresse} onChange={(v) => update("parentAdresse", v)} />
                      <Input label="Nom tuteur" value={form.tuteurNom} onChange={(v) => update("tuteurNom", v)} />
                      <Input label="Lien tuteur" value={form.tuteurLien} onChange={(v) => update("tuteurLien", v)} />
                      <Input label="Téléphone tuteur" value={form.tuteurTel} onChange={(v) => update("tuteurTel", v)} />
                      <Input label="Adresse tuteur" value={form.tuteurAdresse} onChange={(v) => update("tuteurAdresse", v)} />
                    </div>
                  </Card>
                </div>
              )}

              {step === 2 && (
                <Card title="Niveau & Frais de réinscription">
                  <div className="grid gap-3 md:grid-cols-2">
                    <SelectObject
                      label="Année scolaire"
                      value={form.anneeScolaire}
                      onChange={(v) => update("anneeScolaire", v)}
                      options={schoolYears.map((y) => ({
                        value: y.name,
                        label: y.active ? `${y.name} — Principale` : y.name,
                      }))}
                    />

                    <SelectObject
                      label="Classe"
                      value={form.classe}
                      onChange={(v) => update("classe", v)}
                      options={classes.map((c) => ({ value: c.name, label: c.name }))}
                    />

                    <SelectObject
                      label="Série"
                      value={form.section}
                      onChange={(v) => update("section", v)}
                      options={series.map((s) => ({ value: s.name, label: s.name }))}
                    />

                    <Input label="Niveau" value={form.niveau} onChange={(v) => update("niveau", v)} />

                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3 md:col-span-2">
                      <SelectObject
                        label="Frais de réinscription à sélectionner"
                        value={form.reinscriptionFeeId}
                        onChange={(v) => {
                          update("reinscriptionFeeId", v);
                          update("tarifReinscription", "");
                        }}
                        options={feeModels.map((model) => ({
                          value: String(model.id),
                          label: getFeeModelTitle(model),
                        }))}
                      />

                      {selectedFeeModel ? (
                        <>
                          <div className="mt-3">
                            <SelectObject
                              label="Choix tarif"
                              value={form.tarifReinscription}
                              onChange={(v) => update("tarifReinscription", v)}
                              options={availableTarifs.map((tarif) => ({ value: tarif, label: tarif }))}
                            />
                          </div>

                          {form.tarifReinscription ? (
                            <>
                              <div className="mt-3 rounded-xl bg-white px-3 py-3 text-sm font-black text-indigo-900 shadow-sm">
                                Montant du tarif sélectionné : {formatAr(fraisReinscriptionAmount)}
                              </div>

                              <div className="mt-3 overflow-hidden rounded-xl border bg-white">
                                {selectedFeeModelTariffsForSelectedTarif.map((fee) => (
                                  <div key={fee.id} className="flex items-center justify-between border-b px-3 py-2 text-xs font-bold last:border-b-0">
                                    <span className="text-slate-700">{getFeeLabel(fee)}{fee.code ? ` — ${fee.code}` : ""}</span>
                                    <span className="font-black text-indigo-800">{formatAr(getFeeAmountByTarif(fee, form.tarifReinscription))}</span>
                                  </div>
                                ))}

                                {selectedFeeModelTariffsForSelectedTarif.length === 0 && (
                                  <div className="px-3 py-3 text-xs font-black text-red-600">
                                    Aucun frais trouvé pour le tarif « {form.tarifReinscription} ». Vérifiez le modèle dans fee-models.
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="mt-3 rounded-xl bg-white px-3 py-3 text-xs font-black text-indigo-700 shadow-sm">
                              Sélectionnez le tarif à appliquer.
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="mt-3 rounded-xl bg-white px-3 py-3 text-xs font-black text-amber-700 shadow-sm">
                          Aucun modèle trouvé. Créez d’abord un modèle dans Modèles de frais / fee-models pour cette classe et ce site.
                        </div>
                      )}
                    </div>
                  </div>

                  {!selectedFeeModel && (
                    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <TrainingFeesChooser
                        fees={trainingFees}
                        selectedFeeIds={selectedFeeIds}
                        selectedTarif={form.tarifReinscription || "Principal"}
                        loading={feesLoading}
                        onToggle={toggleTrainingFee}
                      />

                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-right">
                        <div className="text-[11px] font-black uppercase tracking-wide text-emerald-700">Total frais sélectionnés</div>
                        <div className="mt-1 text-2xl font-black text-emerald-900">{formatAr(totalTrainingFees)}</div>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {step === 3 && (
                <Card title="Activité">
                  <div className="grid gap-3">
                    <TextArea label="Activité" value={form.activite} onChange={(v) => update("activite", v)} />
                    <TextArea label="Remarque" value={form.remarque} onChange={(v) => update("remarque", v)} />
                  </div>
                </Card>
              )}

              {step === 4 && (
                <Card title="C’est prêt">
                  <div className="flex flex-col items-center gap-4 rounded-2xl bg-emerald-50 p-4 text-center sm:flex-row sm:text-left">
                    {selected && <StudentPhoto student={selected} />}
                    <div>
                      <div className="text-lg font-black text-emerald-900">
                        {form.nom} {form.prenoms}
                      </div>
                      <div className="text-xs font-bold text-emerald-700">
                        Site : {selectedSiteName} • {form.matricule} • {form.anneeScolaire} • {form.classe} • {form.section}
                      </div>
                      <div className="mt-1 text-xs font-black text-emerald-800">
                        Tarif choisi : {form.tarifReinscription || "Non choisi"} • Frais à créer : {formatAr(fraisReinscriptionAmount || totalTrainingFees)}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {message && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-black text-red-700">
                  {message}
                </div>
              )}

              <div className="mt-5 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  disabled={step === 1}
                  className="rounded-2xl border px-5 py-3 text-sm font-black disabled:opacity-40"
                >
                  Retour
                </button>

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
                  >
                    Suivant
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submitReinscription}
                    disabled={loading}
                    className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    {loading ? "Enregistrement..." : "Valider"}
                  </button>
                )}
              </div>
            </div>
          </div>
      </div>
    </main>
  );
}

function TrainingFeesChooser({
  fees,
  selectedFeeIds,
  selectedTarif,
  loading,
  onToggle,
}: {
  fees: TrainingFee[];
  selectedFeeIds: number[];
  selectedTarif: string;
  loading: boolean;
  onToggle: (id: number) => void;
}) {
  if (loading) {
    return <div className="mt-4 rounded-2xl border bg-white p-4 text-sm font-black text-slate-500">Chargement des frais...</div>;
  }

  if (!fees.length) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-800">
        Aucun frais de formation trouvé pour cette classe. Vérifiez la configuration dans Frais de formation.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border bg-white">
      <div className="hidden grid-cols-[60px_1fr_130px_130px] border-b bg-slate-100 px-4 py-3 text-[11px] font-black uppercase text-slate-500 md:grid">
        <div>Choix</div>
        <div>Frais</div>
        <div className="text-right">Principal</div>
        <div className="text-right">Montant choisi</div>
      </div>

      {fees.map((fee) => {
        const checked = selectedFeeIds.includes(fee.id);
        const principal = getPrincipalAmount(fee);
        const selectedAmount = getFeeAmountByTarif(fee, selectedTarif);

        return (
          <label key={fee.id} className="grid cursor-pointer gap-3 border-b px-4 py-3 text-sm font-bold last:border-b-0 md:grid-cols-[60px_1fr_130px_130px] md:items-center">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(fee.id)}
              className="h-5 w-5 accent-slate-950"
            />
            <div>
              <div className="font-black text-slate-900">{getFeeLabel(fee)}</div>
              <div className="text-xs text-slate-500">{fee.code || "-"}</div>
            </div>
            <div className="text-right text-slate-600">{formatAr(principal)}</div>
            <div className="text-right font-black text-slate-950">{formatAr(selectedAmount)}</div>
          </label>
        );
      })}
    </div>
  );
}

function StepBadge({ active, label }: { active: boolean; label: string }) {
  return <div className={`rounded-xl px-2 py-2 ${active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"}`}>{label}</div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="mb-4 text-base font-black">{title}</h2>{children}</section>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <label className="block text-xs font-black text-slate-700">{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-slate-200" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block text-xs font-black text-slate-700">{label}<textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 min-h-[120px] w-full rounded-xl border px-3 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-slate-200" /></label>;
}

function SelectSimple({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return <label className="block text-xs font-black text-slate-700">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3 text-sm font-bold">{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
}

function SelectObject({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <label className="block text-xs font-black text-slate-700">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3 text-sm font-bold"><option value="">Choisir</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

function SearchBox({ q, setQ, results, selectStudent }: { q: string; setQ: (v: string) => void; results: Student[]; selectStudent: (s: Student) => void }) {
  return (
    <div className="relative rounded-2xl border bg-white p-4 shadow-sm">
      <label className="block text-xs font-black text-slate-700">Rechercher l’étudiant à réinscrire</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Matricule, nom ou prénom..."
        className="mt-1 w-full rounded-xl border px-3 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-slate-200"
      />

      {results.length > 0 && (
        <div className="absolute left-4 right-4 top-[88px] z-30 max-h-[280px] overflow-auto rounded-2xl border bg-white shadow-2xl">
          {results.map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => selectStudent(student)}
              className="flex w-full items-center gap-3 border-b px-4 py-3 text-left hover:bg-slate-50"
            >
              <StudentPhoto student={student} small />
              <div>
                <div className="text-sm font-black text-slate-900">{student.matricule} — {student.nom} {student.prenoms}</div>
                <div className="text-xs font-bold text-slate-500">{student.site || "-"} • {student.anneeScolaire} • {student.classe} • {student.section}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentPhoto({ student, small = false }: { student: Student; small?: boolean }) {
  const size = small ? "h-10 w-10" : "h-20 w-20";

  if (student.photoUrl) {
    return <img src={student.photoUrl} alt={student.nom} className={`${size} shrink-0 rounded-2xl border object-cover shadow-sm`} />;
  }

  return (
    <div className={`${size} grid shrink-0 place-items-center rounded-2xl border bg-white text-3xl shadow-sm`}>
      👤
    </div>
  );
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
  const n = Number(
    String(value ?? "")
      .replace(/\s/g, "")
      .replace(",", ".")
  );
  return Number.isFinite(n) ? n : 0;
}

function formatAr(value: unknown) {
  return `${toNumber(value).toLocaleString("fr-FR")} Ar`;
}

function getFeeLabel(fee: TrainingFee | FeeTariff | any) {
  return String(fee.libelle || fee.label || fee.name || fee.code || "Frais");
}

function getPrincipalAmount(fee: TrainingFee | FeeTariff | any) {
  return toNumber(fee.montantPrincipal ?? fee.montant ?? fee.amount ?? 0);
}

function getSpecialTarifs(fee: TrainingFee | FeeTariff | any): TarifsSpeciaux {
  const raw = fee?.tarifsSpeciaux ?? fee?.specials;

  if (!raw) return {};

  if (Array.isArray(raw)) {
    return raw.reduce((acc: TarifsSpeciaux, item: FeeSpecialTariff) => {
      const name = String(item?.name || "").trim();
      if (name) acc[name] = item.amount;
      return acc;
    }, {});
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return raw && typeof raw === "object" ? raw : {};
}

function normalizeModelSpecials(raw: FeeTariff["specials"]) {
  if (!raw) return {};

  if (Array.isArray(raw)) {
    return raw.reduce((acc: TarifsSpeciaux, item) => {
      const name = String(item?.name || "").trim();
      if (name) acc[name] = item.amount;
      return acc;
    }, {});
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return raw;
}

function getFeeAmountByTarif(fee: TrainingFee | FeeTariff | any, tarifName: string) {
  const tarif = String(tarifName || "Principal").trim();

  if (!tarif || tarif.toLowerCase() === "principal") {
    return getPrincipalAmount(fee);
  }

  const specials = getSpecialTarifs(fee);
  return toNumber(specials[tarif] ?? getPrincipalAmount(fee));
}

function hasAmountForTarif(fee: TrainingFee | FeeTariff | any, tarifName: string) {
  return getFeeAmountByTarif(fee, tarifName) > 0;
}

function getFeeModelTitle(model: FeeModel | null | undefined) {
  if (!model) return "";
  return String(model.title || model.name || model.libelle || `Modèle ${model.id}`);
}

function findBestFeeModel(models: FeeModel[]) {
  return models[0] || null;
}
