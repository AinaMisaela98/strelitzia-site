"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Student = {
  id: number;
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

type SchoolYear = { id: number; name: string; active: boolean };
type Serie = { id: number; name: string; classRoomId: number; schoolYearName: string };
type ClassRoom = { id: number; name: string; schoolYearName: string; series: Serie[] };

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
  fraisScolarite: string;
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
  fraisScolarite: "",
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);

  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [classRooms, setClassRooms] = useState<ClassRoom[]>([]);
  const [form, setForm] = useState<FormData>(emptyForm);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const classes = useMemo(
    () => classRooms.filter((c) => c.schoolYearName === form.anneeScolaire),
    [classRooms, form.anneeScolaire]
  );

  const series = useMemo(() => {
    const selectedClass = classes.find((c) => c.name === form.classe);
    return selectedClass?.series?.filter((s) => s.schoolYearName === form.anneeScolaire) || [];
  }, [classes, form.classe, form.anneeScolaire]);

  function update(name: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
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
      const res = await fetch(`/api/students/search?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setMessage("Erreur recherche étudiant.");
    }
  }

  async function loadInitialStudent(id: string) {
    try {
      const res = await fetch(`/api/students/search?studentId=${encodeURIComponent(id)}`);
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
  }, []);

  useEffect(() => {
    if (initialStudentId) loadInitialStudent(initialStudentId);
  }, [initialStudentId]);

  useEffect(() => {
    setForm((p) => ({ ...p, classe: "", section: "" }));
  }, [form.anneeScolaire]);

  useEffect(() => {
    setForm((p) => ({ ...p, section: "" }));
  }, [form.classe]);

  function validateStep() {
    setMessage("");

    if (step === 1) {
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
    }

    return true;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((s) => Math.min(4, s + 1));
  }

  async function submitReinscription() {
    if (!validateStep()) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/students/reinscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selected?.id, data: form }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Erreur pendant la réinscription.");
        return;
      }

      window.location.href = `/user/student/${data.student.id}`;
    } catch {
      setMessage("Erreur serveur pendant la réinscription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[265px] flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-lg font-black">Strelitzia</div>
          <div className="text-[11px] text-slate-400">Espace utilisateur</div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 text-[13px] font-bold">
          <SideLink href="/user" icon="🏠" label="Tableau de bord" />
          <SideLink href="/user/reinscription" icon="↻" label="Réinscription" active />
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b bg-white/90 px-3 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border px-3 py-2 font-black"
            >
              ☰
            </button>

            <div className="text-sm font-black">Réinscription</div>

            <Link href="/user" prefetch={false} className="rounded-xl border px-3 py-2 text-xs font-bold">
              Retour
            </Link>
          </div>
        </header>

        <div className="p-3 sm:p-5">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[24px] border bg-white shadow-xl">
            <div className="bg-slate-950 px-4 py-5 text-white sm:px-6">
              <h1 className="text-xl font-black sm:text-2xl">Réinscription étudiant</h1>
              <p className="mt-1 text-xs text-slate-300">
                Informations modifiables avec photo automatique.
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
                            {selected.matricule} • {selected.anneeScolaire} • {selected.classe} • {selected.section}
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
                <Card title="Niveau & Frais de formations">
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
                    <Input label="Frais d’inscription" value={form.fraisInscription} onChange={(v) => update("fraisInscription", v)} />
                    <Input label="Frais de scolarité" value={form.fraisScolarite} onChange={(v) => update("fraisScolarite", v)} />
                  </div>
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
                        {form.matricule} • {form.anneeScolaire} • {form.classe} • {form.section}
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
    </div>
  );
}

function StudentPhoto({ student }: { student: Student }) {
  const initials = `${student.nom?.[0] || ""}${student.prenoms?.[0] || ""}`.toUpperCase();

  if (student.photoUrl) {
    return (
      <img
        src={student.photoUrl}
        alt={`${student.nom} ${student.prenoms}`}
        className="h-24 w-24 rounded-3xl border-4 border-white object-cover shadow-lg"
      />
    );
  }

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-slate-900 text-2xl font-black text-white shadow-lg">
      {initials || "?"}
    </div>
  );
}

function SideLink({ href, icon, label, active }: { href: string; icon: string; label: string; active?: boolean }) {
  return (
    <Link href={href} prefetch={false} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10"}`}>
      <span>{icon}</span><span>{label}</span>
    </Link>
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
      <label className="block text-sm font-black">Rechercher étudiant</label>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Matricule, nom ou prénom..." className="mt-2 w-full rounded-xl border px-3 py-3 text-sm font-bold" />
      {results.length > 0 && (
        <div className="absolute left-4 right-4 top-[92px] z-50 max-h-[320px] overflow-auto rounded-xl border bg-white shadow-xl">
          {results.map((s) => (
            <button key={s.id} type="button" onClick={() => selectStudent(s)} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm hover:bg-slate-50">
              <StudentPhotoSmall student={s} />
              <div>
                <b>{s.matricule}</b> — {s.nom} {s.prenoms}
                <div className="text-xs text-slate-500">{s.anneeScolaire} • {s.classe} • {s.section}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentPhotoSmall({ student }: { student: Student }) {
  if (student.photoUrl) {
    return <img src={student.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />;
  }

  return <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">{student.nom?.[0] || "?"}</div>;
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}