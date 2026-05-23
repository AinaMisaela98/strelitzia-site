"use client";

import { useEffect, useState } from "react";

type AuthUser = {
  name: string;
  email: string;
  role: string;
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

const steps = [
  "Info sur l’étudiant",
  "Info parents",
  "Tuteur",
  "Niveau & frais",
  "Activité",
  "Validation",
];

const today = new Date().toISOString().split("T")[0];

export default function InscriptionWizard({ user }: { user: AuthUser }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [academics, setAcademics] = useState<{ year?: string; levels: AcademicLevel[] }>({
    levels: [],
  });

  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

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
    fraisInscription: "",
    fraisScolarite: "",

    activite: "",
    remarque: "",
  });

  useEffect(() => {
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

    loadAcademics();
  }, []);

  function update(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function next() {
    if (step < steps.length - 1) setStep(step + 1);
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  async function save() {
    if (
      !form.dateInscription ||
      !form.matricule ||
      !form.nom ||
      !form.prenoms ||
      !form.sexe ||
      !form.classe ||
      !form.section
    ) {
      alert("Fenoy aloha ireo champs misy *");
      return;
    }

    try {
      setLoading(true);

      const yearRes = await fetch("/api/school-years/active", {
        cache: "no-store",
      });

      const activeYear = yearRes.ok
        ? await yearRes.json()
        : { name: "2025-2026" };

      const res = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          site: "Strelitzia School",
          anneeScolaire: activeYear.name || "2025-2026",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erreur enregistrement");
        return;
      }

      alert("Inscription enregistrée avec succès !");
      window.location.href = "/user";
    } catch {
      alert("Erreur serveur");
    } finally {
      setLoading(false);
    }
  }

  const selectedLevel = academics.levels.find(
    (level) => String(level.id) === selectedLevelId
  );

  const selectedClass = selectedLevel?.classes.find(
    (classe) => String(classe.id) === selectedClassId
  );

  return (
    <main className="fixed inset-0 bg-[#f4f6f8] flex text-[12px] text-slate-900 overflow-hidden">
      <aside className="hidden lg:flex w-[215px] bg-[#4a4a4a] text-white flex-col">
        <div className="h-[68px] bg-white px-3 flex items-center">
          <div>
            <div className="text-[19px] font-black text-red-600 leading-none">
              STRELITZIA
            </div>
            <div className="text-[13px] font-black text-green-600">
              SCHOOL
            </div>
          </div>
        </div>

        <div className="bg-[#303030] px-3 py-3">
          <p className="font-bold">{user.name}</p>
          <p className="text-[10px]">{user.role}</p>
          <p className="text-[10px] text-slate-300">{user.email}</p>
        </div>

        <nav className="flex-1 overflow-y-auto">
          <button
            onClick={() => (window.location.href = "/user")}
            className="w-full text-left px-4 py-2 hover:bg-[#b7b7b7]"
          >
            - Liste des inscrits
          </button>

          <button className="w-full text-left px-4 py-2 bg-[#b7b7b7]">
            - Inscrire un étudiant
          </button>

          <button
            onClick={() => (window.location.href = "/user/school-years")}
            className="w-full text-left px-4 py-2 hover:bg-[#b7b7b7]"
          >
            - Années scolaires
          </button>

          <button
            onClick={() => (window.location.href = "/user/academics")}
            className="w-full text-left px-4 py-2 hover:bg-[#b7b7b7]"
          >
            - Niveaux / Classes / Séries
          </button>
        </nav>
      </aside>

      <section className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <header className="h-[45px] bg-white border-b flex items-center justify-between px-3">
          <h1 className="font-semibold">
            Fiche d’inscription — Année active : {academics.year || "2025-2026"}
          </h1>

          <button
            onClick={() => (window.location.href = "/user")}
            className="bg-slate-800 text-white px-3 py-2"
          >
            Listes des étudiants
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white border p-4">
            <StepHeader step={step} />

            {step === 0 && (
              <Panel title="Info sur l’étudiant">
                <Grid>
                  <Input
                    label="Date inscription *"
                    type="date"
                    value={form.dateInscription}
                    onChange={(v: string) => update("dateInscription", v)}
                    disabled
                  />

                  <Input
                    label="Numéro matricule *"
                    value={form.matricule}
                    onChange={(v: string) => update("matricule", v)}
                  />

                  <PhotoInput
                    value={form.photoUrl}
                    onChange={(v: string) => update("photoUrl", v)}
                  />

                  <Input
                    label="Nom *"
                    value={form.nom}
                    onChange={(v: string) => update("nom", v)}
                  />

                  <Input
                    label="Prénoms *"
                    value={form.prenoms}
                    onChange={(v: string) => update("prenoms", v)}
                  />

                  <Select
                    label="Genre *"
                    value={form.sexe}
                    options={["Masculin", "Feminin"]}
                    onChange={(v: string) => update("sexe", v)}
                  />

                  <Input
                    label="Date de naissance"
                    type="date"
                    value={form.dateNaissance}
                    onChange={(v: string) => update("dateNaissance", v)}
                  />

                  <Input
                    label="Lieu de naissance"
                    value={form.lieuNaissance}
                    onChange={(v: string) => update("lieuNaissance", v)}
                  />

                  <Input
                    label="Téléphone"
                    value={form.telephone}
                    onChange={(v: string) => update("telephone", v)}
                  />

                  <Input
                    label="Adresse"
                    value={form.adresse}
                    onChange={(v: string) => update("adresse", v)}
                  />

                  <Input
                    label="Signe particulier"
                    value={form.signeParticulier}
                    onChange={(v: string) => update("signeParticulier", v)}
                  />

                  <Input
                    label="Maladie ou allergique"
                    value={form.maladieAllergie}
                    onChange={(v: string) => update("maladieAllergie", v)}
                  />

                  <Input
                    label="Email"
                    value={form.email}
                    onChange={(v: string) => update("email", v)}
                  />
                </Grid>
              </Panel>
            )}

            {step === 1 && (
              <Panel title="Info parents">
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
              <Panel title="Tuteur">
                <Grid>
                  <Input label="Nom du tuteur" value={form.tuteurNom} onChange={(v: string) => update("tuteurNom", v)} />
                  <Input label="Lien avec l’étudiant" value={form.tuteurLien} onChange={(v: string) => update("tuteurLien", v)} />
                  <Input label="Téléphone tuteur" value={form.tuteurTel} onChange={(v: string) => update("tuteurTel", v)} />
                  <Input label="Adresse tuteur" value={form.tuteurAdresse} onChange={(v: string) => update("tuteurAdresse", v)} />
                </Grid>
              </Panel>
            )}

            {step === 3 && (
              <Panel title="Niveau & frais de formations">
                <Grid>
                  <Select
                    label="Niveau"
                    value={selectedLevelId}
                    options={academics.levels.map((level) => ({
                      label: level.name,
                      value: String(level.id),
                    }))}
                    onChange={(value: string) => {
                      setSelectedLevelId(value);
                      setSelectedClassId("");

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

                      const classe = selectedLevel?.classes.find(
                        (c) => String(c.id) === value
                      );

                      update("classe", classe?.name || "");
                      update("section", "");
                    }}
                  />

                  <Select
                    label="Série / Section *"
                    value={form.section}
                    options={(selectedClass?.series || []).map((serie) => serie.name)}
                    onChange={(v: string) => update("section", v)}
                  />

                  <Input
                    label="Frais d’inscription"
                    value={form.fraisInscription}
                    onChange={(v: string) => update("fraisInscription", v)}
                  />

                  <Input
                    label="Frais de scolarité"
                    value={form.fraisScolarite}
                    onChange={(v: string) => update("fraisScolarite", v)}
                  />
                </Grid>

                {academics.levels.length === 0 && (
                  <div className="mt-4 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-xl p-4">
                    Aucun niveau/classe/série créé pour l’année active.
                    <button
                      onClick={() => (window.location.href = "/user/academics")}
                      className="ml-3 bg-yellow-600 text-white px-3 py-2 rounded-lg"
                    >
                      Créer maintenant
                    </button>
                  </div>
                )}
              </Panel>
            )}

            {step === 4 && (
              <Panel title="Activité">
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
              <Panel title="Validation">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 border p-4">
                  {form.photoUrl && (
                    <div className="md:col-span-2">
                      <img
                        src={form.photoUrl}
                        alt="Photo étudiant"
                        className="w-28 h-32 object-cover rounded-xl border"
                      />
                    </div>
                  )}

                  {Object.entries(form).map(([key, value]) => (
                    <p key={key}>
                      <b>{key} :</b> {value || "-"}
                    </p>
                  ))}
                </div>
              </Panel>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={prev}
                disabled={step === 0}
                className="bg-slate-300 disabled:opacity-40 px-4 py-2 font-bold"
              >
                Étape précédente
              </button>

              {step < steps.length - 1 ? (
                <button
                  onClick={next}
                  className="bg-[#252a33] text-white px-5 py-2 font-bold"
                >
                  Étape suivante
                </button>
              ) : (
                <button
                  onClick={save}
                  disabled={loading}
                  className="bg-green-600 disabled:opacity-60 text-white px-5 py-2 font-bold"
                >
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StepHeader({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-between mb-8 overflow-x-auto">
      {steps.map((s, i) => (
        <div key={s} className="min-w-[150px] flex-1 text-center">
          <div
            className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center border font-bold ${
              i <= step
                ? "bg-[#252a33] text-white border-[#252a33]"
                : "bg-white text-slate-400 border-slate-300"
            }`}
          >
            {i + 1}
          </div>

          <p className={`mt-2 ${i === step ? "text-red-500 font-bold" : "text-slate-400"}`}>
            {s}
          </p>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, children }: any) {
  return (
    <div>
      <h2 className="text-sm font-bold mb-4 text-slate-700">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }: any) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Input({ label, value, onChange, type = "text", disabled = false }: any) {
  return (
    <label className="block">
      <span className="text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-slate-400 py-2 outline-none focus:border-blue-600 disabled:bg-slate-100"
      />
    </label>
  );
}

function PhotoInput({ value, onChange }: any) {
  return (
    <label className="block md:col-span-2">
      <span className="text-slate-600">Photo étudiant</span>

      <div className="mt-2 flex items-center gap-4">
        {value ? (
          <img
            src={value}
            alt="Photo étudiant"
            className="w-24 h-28 object-cover rounded-xl border"
          />
        ) : (
          <div className="w-24 h-28 bg-slate-200 rounded-xl border flex items-center justify-center text-3xl">
            👤
          </div>
        )}

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
          className="flex-1 border rounded-xl px-4 py-3"
        />
      </div>
    </label>
  );
}

function Select({ label, value, onChange, options }: any) {
  return (
    <label className="block">
      <span className="text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-slate-400 py-2 outline-none focus:border-blue-600"
      >
        <option value="">-- Choisir --</option>
        {options.map((op: any) => {
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

function Textarea({ label, value, onChange }: any) {
  return (
    <label className="block md:col-span-2">
      <span className="text-slate-600">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full mt-2 border border-slate-400 p-3 outline-none focus:border-blue-600"
      />
    </label>
  );
}