"use client";

import { useState } from "react";

export default function StudentDetails({ user, student }: any) {
  const [tab, setTab] = useState("PDF");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
  ...student,

  signeParticulier: student.signeParticulier || "",
  maladieAllergie: student.maladieAllergie || "",
});
  const [saving, setSaving] = useState(false);

  const tabs = [
    "PDF",
    "ETUDIANT",
    "PARENTS",
    "TUTEURS",
    "FRAIS DE FORMATION",
    "ACTIVITÉS",
    "R-A-S",
    "LES EXAMENS",
    "CERTIFICAT",
  ];

  function update(name: string, value: string) {
    setForm((prev: any) => ({ ...prev, [name]: value }));
  }

  async function saveStudent() {
  try {
    setSaving(true);

    const payload = {
      photoUrl: form.photoUrl || "",
      matricule: form.matricule || "",
      site: form.site || "Strelitzia School",
      anneeScolaire: form.anneeScolaire || "2025-2026",
      dateInscription: form.dateInscription,

      nom: form.nom || "",
      prenoms: form.prenoms || "",
      sexe: form.sexe === "Feminin" ? "Feminin" : "Masculin",
      classe: form.classe || "",
      section: form.section || "",

      contact: form.contact || "",
      dateNaissance: form.dateNaissance || null,
      lieuNaissance: form.lieuNaissance || "",
      adresse: form.adresse || "",
      signeParticulier: form.signeParticulier || "",
      maladieAllergie: form.maladieAllergie || "",
      email: form.email || "",

      pereNom: form.pereNom || "",
      pereTel: form.pereTel || "",
      mereNom: form.mereNom || "",
      mereTel: form.mereTel || "",
      parentAdresse: form.parentAdresse || "",

      tuteurNom: form.tuteurNom || "",
      tuteurLien: form.tuteurLien || "",
      tuteurTel: form.tuteurTel || "",
      tuteurAdresse: form.tuteurAdresse || "",

      niveau: form.niveau || "",
      fraisInscription: form.fraisInscription || "",
      fraisScolarite: form.fraisScolarite || "",

      activite: form.activite || "",
      remarque: form.remarque || "",
    };

    const res = await fetch(`/api/students/${form.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erreur modification étudiant");
      return;
    }

    setForm(data);
    setEditing(false);
    alert("Modification enregistrée avec succès !");
  } catch {
    alert("Erreur serveur");
  } finally {
    setSaving(false);
  }
}

  async function deleteStudent() {
    const ok = confirm(
      "Voulez-vous vraiment supprimer cet étudiant ?\n\nToutes ses informations seront supprimées définitivement."
    );

    if (!ok) return;

    const res = await fetch(`/api/students/${form.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Erreur suppression étudiant");
      return;
    }

    alert("Étudiant supprimé avec succès.");
    window.location.href = "/user";
  }

  function printPdfOnly() {
    window.print();
  }

  return (
    <main className="fixed inset-0 flex bg-[#eef2f7] overflow-hidden text-slate-900">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          body * {
            visibility: hidden !important;
          }

          #pdf-print-area,
          #pdf-print-area * {
            visibility: visible !important;
          }

          #pdf-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .pdf-page {
            box-shadow: none !important;
            margin: 0 auto !important;
            width: 190mm !important;
            min-height: 277mm !important;
          }
        }
      `}</style>

      <aside className="hidden lg:flex w-[220px] bg-[#4a4a4a] text-white flex-col no-print">
        <div className="h-[70px] bg-white flex items-center px-3">
          <div>
            <div className="text-[22px] font-black text-red-600 leading-none">
              STRELITZIA
            </div>
            <div className="text-[14px] font-black text-green-600">
              SCHOOL
            </div>
          </div>
        </div>

        <div className="bg-[#303030] px-3 py-3">
          <p className="font-bold">{user.name}</p>
          <p className="text-[11px]">{user.role}</p>
        </div>

        <button
          onClick={() => (window.location.href = "/user")}
          className="w-full text-left px-4 py-3 hover:bg-[#b7b7b7]"
        >
          ← Retour liste étudiants
        </button>
      </aside>

      <section className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[58px] shrink-0 bg-white border-b px-4 flex items-center justify-between no-print">
          <h1 className="text-[18px] font-bold">
            Fiche étudiant › {form.nom} {form.prenoms}
          </h1>

          <button
            onClick={() => (window.location.href = "/user")}
            className="border px-3 py-2 rounded-md hover:bg-slate-50"
          >
            Liste des étudiants
          </button>
        </header>

        <div className="shrink-0 bg-white border-b px-4 py-3 flex gap-4 overflow-x-auto no-print">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap px-3 py-2 rounded-md font-semibold text-sm ${
                tab === t
                  ? "bg-slate-800 text-white"
                  : "text-blue-600 hover:bg-blue-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-[#d9dde3] p-6">
          {tab === "PDF" && (
            <PdfPage student={form} printPdfOnly={printPdfOnly} />
          )}

          {tab === "ETUDIANT" && (
            <ProCard
              title="Informations de l’étudiant"
              subtitle="Identité, photo et coordonnées"
            >
              <div className="mb-8 grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6 items-start">
                <div className="rounded-2xl border bg-slate-50 p-4 flex justify-center">
                  {form.photoUrl ? (
                    <img
                      src={form.photoUrl}
                      alt={form.nom}
                      className="w-[140px] h-[165px] object-cover rounded-xl border shadow-sm"
                    />
                  ) : (
                    <div className="w-[140px] h-[165px] bg-slate-200 border rounded-xl flex items-center justify-center text-[55px]">
                      👤
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border bg-white p-5">
                  <label className="block">
                    <span className="text-[12px] font-semibold text-slate-500">
                      Photo étudiant
                    </span>

                    {editing ? (
                     <input
  type="file"
  accept="image/*"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch("/api/upload/student-photo", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erreur upload photo");
      return;
    }

    update("photoUrl", data.url);
    alert("Photo chargée. Clique Enregistrer pour sauvegarder.");
  }}
  className="mt-2 w-full border border-slate-200 bg-white rounded-xl px-4 py-3"
/>
                    ) : (
                      <p className="mt-2 text-slate-700">
                        {form.photoUrl ? "Photo enregistrée" : "Aucune photo"}
                      </p>
                    )}
                  </label>

                  <p className="text-xs text-slate-500 mt-2">
                    La photo est enregistrée dans la base de données et apparaît automatiquement dans le PDF.
                  </p>
                </div>
              </div>

              <Grid>
                <Field label="Matricule" name="matricule" value={form.matricule} editing={editing} onChange={update} />
                <Field label="Nom" name="nom" value={form.nom} editing={editing} onChange={update} />
                <Field label="Prénoms" name="prenoms" value={form.prenoms} editing={editing} onChange={update} />
                <SelectField label="Sexe" name="sexe" value={form.sexe} editing={editing} onChange={update} options={["Masculin", "Feminin"]} />
                <Field label="Classe" name="classe" value={form.classe} editing={editing} onChange={update} />
                <Field label="Section" name="section" value={form.section} editing={editing} onChange={update} />
                <Field label="Date naissance" name="dateNaissance" value={toInputDate(form.dateNaissance)} editing={editing} onChange={update} type="date" />
                <Field label="Lieu naissance" name="lieuNaissance" value={form.lieuNaissance} editing={editing} onChange={update} />
                <Field label="Téléphone" name="contact" value={form.contact} editing={editing} onChange={update} />
                <Field label="Adresse" name="adresse" value={form.adresse} editing={editing} onChange={update} />
                <Field
                    label="Signe particulier"
                    name="signeParticulier"
                    value={form.signeParticulier}
                    editing={editing}
                    onChange={update}
                />
                  <Field
                    label="Maladie ou allergique"
                    name="maladieAllergie"
                    value={form.maladieAllergie}
                    editing={editing}
                    onChange={update}
                />

                
                <Field label="Email" name="email" value={form.email} editing={editing} onChange={update} />
              </Grid>

              <BottomActions
                editing={editing}
                setEditing={setEditing}
                saveStudent={saveStudent}
                saving={saving}
                deleteStudent={deleteStudent}
                showDelete
              />
            </ProCard>
          )}

          {tab === "PARENTS" && (
            <ProCard
              title="Informations des parents"
              subtitle="Coordonnées et informations familiales"
            >
              <Grid>
                <Field label="Nom du père" name="pereNom" value={form.pereNom} editing={editing} onChange={update} />
                <Field label="Téléphone père" name="pereTel" value={form.pereTel} editing={editing} onChange={update} />
                <Field label="Nom de la mère" name="mereNom" value={form.mereNom} editing={editing} onChange={update} />
                <Field label="Téléphone mère" name="mereTel" value={form.mereTel} editing={editing} onChange={update} />
                <Field label="Adresse parents" name="parentAdresse" value={form.parentAdresse} editing={editing} onChange={update} />
              </Grid>

              <BottomActions
                editing={editing}
                setEditing={setEditing}
                saveStudent={saveStudent}
                saving={saving}
              />
            </ProCard>
          )}

          {tab === "TUTEURS" && (
            <ProCard
              title="Informations du tuteur"
              subtitle="Personne responsable ou contact secondaire"
            >
              <Grid>
                <Field label="Nom tuteur" name="tuteurNom" value={form.tuteurNom} editing={editing} onChange={update} />
                <Field label="Lien avec l’étudiant" name="tuteurLien" value={form.tuteurLien} editing={editing} onChange={update} />
                <Field label="Téléphone tuteur" name="tuteurTel" value={form.tuteurTel} editing={editing} onChange={update} />
                <Field label="Adresse tuteur" name="tuteurAdresse" value={form.tuteurAdresse} editing={editing} onChange={update} />
              </Grid>

              <BottomActions
                editing={editing}
                setEditing={setEditing}
                saveStudent={saveStudent}
                saving={saving}
              />
            </ProCard>
          )}

          {tab === "FRAIS DE FORMATION" && (
            <ProCard
              title="Frais de formation"
              subtitle="Niveau et informations financières"
            >
              <Grid>
                <Field label="Niveau" name="niveau" value={form.niveau} editing={editing} onChange={update} />
                <Field label="Frais inscription" name="fraisInscription" value={form.fraisInscription} editing={editing} onChange={update} />
                <Field label="Frais scolarité" name="fraisScolarite" value={form.fraisScolarite} editing={editing} onChange={update} />
              </Grid>

              <BottomActions editing={editing} setEditing={setEditing} saveStudent={saveStudent} saving={saving} />
            </ProCard>
          )}

          {tab === "ACTIVITÉS" && (
            <ProCard title="Activités" subtitle="Activités scolaires">
              <Grid>
                <Field label="Activité" name="activite" value={form.activite} editing={editing} onChange={update} />
              </Grid>

              <BottomActions editing={editing} setEditing={setEditing} saveStudent={saveStudent} saving={saving} />
            </ProCard>
          )}

          {tab === "R-A-S" && (
            <ProCard title="R-A-S" subtitle="Remarques et observations">
              <TextAreaField label="Remarque" name="remarque" value={form.remarque} editing={editing} onChange={update} />

              <BottomActions editing={editing} setEditing={setEditing} saveStudent={saveStudent} saving={saving} />
            </ProCard>
          )}

          {tab === "LES EXAMENS" && (
            <ProCard title="Les examens" subtitle="Résultats et suivi">
              <p className="text-slate-500">Aucun examen enregistré.</p>
            </ProCard>
          )}

          {tab === "CERTIFICAT" && (
            <ProCard title="Certificat" subtitle="Documents administratifs">
              <p className="text-slate-500">Aucun certificat disponible.</p>
            </ProCard>
          )}
        </div>
      </section>
    </main>
  );
}

function BottomActions({
  editing,
  setEditing,
  saveStudent,
  saving,
  deleteStudent,
  showDelete = false,
}: any) {
  return (
    <div className="mt-10 pt-6 border-t flex flex-wrap justify-end gap-3">
      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-xl font-bold shadow-sm"
        >
          Modifier
        </button>
      ) : (
        <>
          <button
            onClick={() => setEditing(false)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold"
          >
            Annuler
          </button>

          <button
            onClick={saveStudent}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-bold shadow-sm"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </>
      )}

      {showDelete && (
        <button
          onClick={deleteStudent}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-bold shadow-sm"
        >
          Supprimer l’étudiant
        </button>
      )}
    </div>
  );
}

function Field({ label, name, value, editing, onChange, type = "text" }: any) {
  if (editing) {
    return (
      <label className="block">
        <span className="text-[12px] font-semibold text-slate-500">{label}</span>
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
          className="mt-1 w-full border border-slate-200 bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </label>
    );
  }

  return <Info label={label} value={type === "date" ? formatDate(value) : value} />;
}

function SelectField({ label, name, value, editing, onChange, options }: any) {
  if (editing) {
    return (
      <label className="block">
        <span className="text-[12px] font-semibold text-slate-500">{label}</span>
        <select
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
          className="mt-1 w-full border border-slate-200 bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        >
          <option value="">-- Choisir --</option>
          {options.map((op: string) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return <Info label={label} value={value} />;
}

function TextAreaField({ label, name, value, editing, onChange }: any) {
  if (editing) {
    return (
      <label className="block">
        <span className="text-[12px] font-semibold text-slate-500">{label}</span>
        <textarea
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
          rows={5}
          className="mt-1 w-full border border-slate-200 bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </label>
    );
  }

  return <Info label={label} value={value} />;
}

function PdfPage({ student, printPdfOnly }: any) {
  return (
    <div className="mx-auto">
      <div className="no-print mb-4 flex justify-end gap-3">
        <button
          onClick={printPdfOnly}
          title="Imprimer la fiche PDF"
          className="w-11 h-11 rounded-full bg-slate-900 text-white text-xl hover:bg-black shadow"
        >
          🖨
        </button>

        <button
          onClick={() => alert("Drive bientôt disponible")}
          title="Drive"
          className="w-11 h-11 rounded-full bg-green-600 text-white text-xl hover:bg-green-700 shadow"
        >
          ☁
        </button>
      </div>

      <div id="pdf-print-area">
        <div className="pdf-page bg-white shadow-2xl w-[850px] min-h-[1180px] p-12 text-[14px] text-black mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="font-black text-[18px] uppercase">Strelitzia School</h2>
              <p className="text-[12px]">Année scolaire : {student.anneeScolaire}</p>
              <p className="text-[12px]">Site : {student.site}</p>
            </div>

            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.nom}
                className="w-[125px] h-[145px] object-cover border"
              />
            ) : (
              <div className="w-[125px] h-[145px] bg-slate-200 border flex items-center justify-center text-[45px]">
                👤
              </div>
            )}
          </div>

          <h1 className="text-center text-[22px] font-black underline mb-8">
            FICHE DE RENSEIGNEMENT
          </h1>

          <PdfSection title="INFORMATION CONCERNANT L'ÉLÈVE">
            <PdfLine label="Matricule" value={student.matricule} />
            <PdfLine label="Nom" value={student.nom} />
            <PdfLine label="Prénom" value={student.prenoms} />
            <PdfLine label="Date et lieu de naissance" value={`${formatDate(student.dateNaissance)} à ${student.lieuNaissance || "-"}`} />
            <PdfLine label="Sexe" value={student.sexe} />
            <PdfLine label="Classe" value={student.classe} />
            <PdfLine label="Section" value={student.section} />
            <PdfLine label="Téléphone" value={student.contact} />
            <PdfLine label="Adresse" value={student.adresse} />
            <PdfLine label="Signe particulier" value={student.signeParticulier} />
            <PdfLine label="Maladie ou allergique" value={student.maladieAllergie} />
            <PdfLine label="Email" value={student.email} />
          </PdfSection>

          <PdfSection title="INFORMATION CONCERNANT LES PARENTS">
            <PdfLine label="Père" value={student.pereNom} />
            <PdfLine label="Téléphone père" value={student.pereTel} />
            <PdfLine label="Mère" value={student.mereNom} />
            <PdfLine label="Téléphone mère" value={student.mereTel} />
            <PdfLine label="Adresse parents" value={student.parentAdresse} />
          </PdfSection>

          <PdfSection title="INFORMATION CONCERNANT LE TUTEUR">
            <PdfLine label="Tuteur" value={student.tuteurNom} />
            <PdfLine label="Lien" value={student.tuteurLien} />
            <PdfLine label="Téléphone tuteur" value={student.tuteurTel} />
            <PdfLine label="Adresse tuteur" value={student.tuteurAdresse} />
          </PdfSection>

          <PdfSection title="NIVEAU & FRAIS DE FORMATION">
            <PdfLine label="Niveau" value={student.niveau} />
            <PdfLine label="Frais inscription" value={student.fraisInscription} />
            <PdfLine label="Frais scolarité" value={student.fraisScolarite} />
          </PdfSection>

          <PdfSection title="ACTIVITÉS / R-A-S">
            <PdfLine label="Activité" value={student.activite} />
            <PdfLine label="Remarque" value={student.remarque} />
          </PdfSection>
        </div>
      </div>
    </div>
  );
}

function ProCard({ title, subtitle, children }: any) {
  return (
    <div className="max-w-[1100px] mx-auto bg-white shadow-xl border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-8 py-6 border-b bg-gradient-to-r from-slate-50 to-white">
        <h2 className="text-[24px] font-black text-slate-900">{title}</h2>
        <p className="text-slate-500 mt-1">{subtitle}</p>
      </div>

      <div className="p-8">{children}</div>
    </div>
  );
}

function PdfSection({ title, children }: any) {
  return (
    <section className="mb-8">
      <h3 className="text-center font-black underline mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function PdfLine({ label, value }: any) {
  return (
    <div className="flex gap-2 border-b border-black min-h-[28px] items-end">
      <span className="font-bold min-w-[220px]">{label} :</span>
      <span>{value || "-"}</span>
    </div>
  );
}

function Grid({ children }: any) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

function Info({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 hover:bg-white transition">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-[16px] font-semibold break-words text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}

function formatDate(date?: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR");
}

function toInputDate(date?: string | null) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}