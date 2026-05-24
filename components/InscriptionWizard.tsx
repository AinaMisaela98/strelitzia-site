"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function InscriptionWizard({ user }: { user: AuthUser }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [academics, setAcademics] = useState<{
    year?: string;
    levels: AcademicLevel[];
  }>({
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

  const progress = useMemo(() => {
    return Math.round(((step + 1) / steps.length) * 100);
  }, [step]);

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
          <SideButton label="Liste des inscrits" onClick={() => (window.location.href = "/user")} />
          <SideButton label="Inscrire un étudiant" active />
          <SideButton label="Années scolaires" onClick={() => (window.location.href = "/user/school-years")} />
          <SideButton label="Niveaux / Classes / Séries" onClick={() => (window.location.href = "/user/academics")} />
        </nav>
      </aside>

      <section className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <header className="h-[76px] shrink-0 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between px-5 shadow-sm">
          <div>
            <h1 className="text-[20px] font-black text-slate-900">
              Fiche d’inscription
            </h1>
            <p className="text-slate-500 text-[12px]">
              Année scolaire active :{" "}
              <span className="font-bold text-blue-700">
                {academics.year || "2025-2026"}
              </span>
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/user")}
            className="bg-slate-900 hover:bg-blue-700 text-white px-4 py-3 rounded-2xl font-bold shadow-lg shadow-slate-900/20 transition"
          >
            ← Liste des étudiants
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/95 backdrop-blur rounded-[28px] border border-white/70 shadow-2xl overflow-hidden">
              <div className="p-5 md:p-7 border-b bg-gradient-to-r from-white via-blue-50 to-white">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <p className="text-blue-700 font-black text-xs uppercase tracking-[0.2em]">
                      Inscription étudiant
                    </p>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                      {steps[step]}
                    </h2>
                    <p className="text-slate-500 mt-1">
                      Étape {step + 1} sur {steps.length} — progression {progress}%
                    </p>
                  </div>

                  <div className="w-full lg:w-[360px]">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                      <span>Progression</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <StepHeader step={step} />
              </div>

              <div className="p-5 md:p-8 bg-slate-50/70">
                {step === 0 && (
                  <Panel
                    icon="👨‍🎓"
                    title="Info sur l’étudiant"
                    subtitle="Informations personnelles, contact, photo et santé."
                  >
                    <Grid>
                      <Input label="Date inscription *" type="date" value={form.dateInscription} onChange={(v: string) => update("dateInscription", v)} disabled />
                      <Input label="Numéro matricule *" value={form.matricule} onChange={(v: string) => update("matricule", v)} />
                      <PhotoInput value={form.photoUrl} onChange={(v: string) => update("photoUrl", v)} />
                      <Input label="Nom *" value={form.nom} onChange={(v: string) => update("nom", v)} />
                      <Input label="Prénoms *" value={form.prenoms} onChange={(v: string) => update("prenoms", v)} />
                      <Select label="Genre *" value={form.sexe} options={["Masculin", "Feminin"]} onChange={(v: string) => update("sexe", v)} />
                      <Input label="Date de naissance" type="date" value={form.dateNaissance} onChange={(v: string) => update("dateNaissance", v)} />
                      <Input label="Lieu de naissance" value={form.lieuNaissance} onChange={(v: string) => update("lieuNaissance", v)} />
                      <Input label="Téléphone" value={form.telephone} onChange={(v: string) => update("telephone", v)} />
                      <Input label="Adresse" value={form.adresse} onChange={(v: string) => update("adresse", v)} />
                      <Input label="Signe particulier" value={form.signeParticulier} onChange={(v: string) => update("signeParticulier", v)} />
                      <Input label="Maladie ou allergique" value={form.maladieAllergie} onChange={(v: string) => update("maladieAllergie", v)} />
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
                    subtitle="Choix du niveau, classe, série et frais."
                  >
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

                      <Input label="Frais d’inscription" value={form.fraisInscription} onChange={(v: string) => update("fraisInscription", v)} />
                      <Input label="Frais de scolarité" value={form.fraisScolarite} onChange={(v: string) => update("fraisScolarite", v)} />
                    </Grid>

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
                        <h3 className="font-black text-lg mt-4">{form.nom || "-"} {form.prenoms || ""}</h3>
                        <p className="text-slate-500">{form.classe || "-"} / {form.section || "-"}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(form)
                          .filter(([key]) => key !== "photoUrl")
                          .map(([key, value]) => (
                            
                          <div key={key} className="bg-white rounded-2xl border p-4">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-bold">{key}</p>
                            <p className="font-bold text-slate-800 mt-1 break-words">{value || "-"}</p>
                          </div>
                        ))}
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