"use client";

import { useEffect, useMemo, useState } from "react";

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type SchoolYear = {
  id: number;
  name: string;
  active: boolean;
};

type Student = {
  id: number;
  matricule: string;
  site: string;
  anneeScolaire: string;
  dateInscription: string;
  photoUrl?: string | null;
  nom: string;
  prenoms: string;
  sexe: string;
  classe: string;
  section: string;
  contact?: string | null;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  pereNom?: string | null;
  mereNom?: string | null;
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

const menus = [
  {
    title: "Tableau de bord",
    items: [
      "Recette prévisionnel",
      "Matériel",
      "Dépenses prévisionnel",
      "CA prévisionnel",
    ],
  },
  {
    title: "Étudiants",
    items: [
      "Liste des inscrits",
      "Inscrire un étudiant",
      "Réinscription",
      "Paiement",
      "État paiement des frais",
      "État paiement des activités",
    ],
  },
  {
    title: "Académique",
    items: ["Années scolaires", "Niveaux / Classes / Séries"],
  },
  {
    title: "Activité extras",
    items: ["Favoris", "Forfait activité extras", "Inscription activité extras"],
  },
  {
    title: "Parents",
    items: ["Liste des parents"],
  },
  {
    title: "Accessoire",
    items: ["Liste des accessoires", "Liste des commandes"],
  },
];

export default function UserDashboard({ user }: { user: AuthUser }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [selectedYear, setSelectedYear] = useState("");

  const [academics, setAcademics] = useState<{ levels: AcademicLevel[] }>({
    levels: [],
  });

  const [search, setSearch] = useState("");
  const [classe, setClasse] = useState("TOUT");
  const [serie, setSerie] = useState("TOUT");

  async function loadSchoolYears() {
    try {
      const res = await fetch("/api/school-years", { cache: "no-store" });
      const data = await res.json();

      if (Array.isArray(data)) {
        setSchoolYears(data);

        const active = data.find((y: SchoolYear) => y.active);

        if (active && !selectedYear) {
          setSelectedYear(active.name);
        }
      }
    } catch {
      setSchoolYears([]);
    }
  }

  async function loadAcademics(yearParam?: string) {
    try {
      const yearToUse = yearParam || selectedYear;

      const url = yearToUse
        ? `/api/academics?year=${encodeURIComponent(yearToUse)}`
        : "/api/academics";

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (data?.levels) {
        setAcademics({ levels: data.levels });
      } else {
        setAcademics({ levels: [] });
      }
    } catch {
      setAcademics({ levels: [] });
    }
  }

  async function loadStudents(yearParam?: string) {
    try {
      setLoadingStudents(true);

      const yearToUse = yearParam || selectedYear;

      const url = yearToUse
        ? `/api/students?year=${encodeURIComponent(yearToUse)}`
        : "/api/students";

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }

  useEffect(() => {
    loadSchoolYears();
  }, []);

  useEffect(() => {
    loadStudents(selectedYear);
    loadAcademics(selectedYear);
  }, [selectedYear]);

  const allClasses = useMemo(() => {
    return academics.levels.flatMap((level) => level.classes);
  }, [academics]);

  const selectedClassObj = allClasses.find((c) => c.name === classe);

  const availableSeries =
    classe === "TOUT"
      ? allClasses.flatMap((c) => c.series)
      : selectedClassObj?.series || [];

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const text = `
        ${s.matricule}
        ${s.site}
        ${s.anneeScolaire}
        ${s.nom}
        ${s.prenoms}
        ${s.sexe}
        ${s.classe}
        ${s.section}
        ${s.contact || ""}
        ${s.lieuNaissance || ""}
      `.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (classe === "TOUT" || s.classe === classe) &&
        (serie === "TOUT" || s.section === serie)
      );
    });
  }, [students, search, classe, serie]);

  function resetFilters() {
    setSearch("");
    setClasse("TOUT");
    setSerie("TOUT");
  }

  function formatDate(date?: string | null) {
    if (!date) return "-";
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("fr-FR");
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function deleteStudent(id: number) {
    if (!confirm("Supprimer cet étudiant ?")) return;

    const res = await fetch(`/api/students/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Erreur suppression étudiant");
      return;
    }

    loadStudents(selectedYear);
  }

  function handleMenuClick(item: string) {
    if (item === "Liste des inscrits") {
      window.location.href = "/user";
      return;
    }

    if (item === "Inscrire un étudiant") {
      window.location.href = "/user/inscription";
      return;
    }

    if (item === "Années scolaires") {
      window.location.href = "/user/school-years";
      return;
    }

    if (item === "Niveaux / Classes / Séries") {
      window.location.href = "/user/academics";
      return;
    }

    alert(item);
  }

  return (
    <main className="fixed inset-0 bg-[#eef2f7] flex overflow-hidden text-[12px] text-slate-900">
      <style>{`
        .school-scroll::-webkit-scrollbar { width: 8px; }
        .school-scroll::-webkit-scrollbar-thumb { background: #a3a3a3; border-radius: 10px; }
        .school-scroll::-webkit-scrollbar-track { background: #3f3f3f; }

        .table-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .table-scroll::-webkit-scrollbar-thumb { background: #9ca3af; border-radius: 10px; }
        .table-scroll::-webkit-scrollbar-track { background: #e5e7eb; }

        @media print {
          aside, .top-actions, .search-zone, footer { display: none !important; }
          main { position: static !important; }
          section { width: 100% !important; }
        }
      `}</style>

      <aside
        className={`fixed lg:relative z-50 h-full w-[215px] shrink-0 bg-[#4a4a4a] text-white flex flex-col border-r border-slate-600 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-[68px] shrink-0 bg-white flex items-center justify-between px-2 border-b">
          <div className="leading-none">
            <div className="text-[19px] font-black text-red-600">STRELITZIA</div>
            <div className="text-[13px] font-black text-green-600">SCHOOL</div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-700 text-xl"
          >
            ☰
          </button>
        </div>

        <div className="shrink-0 bg-[#303030] px-3 py-3 flex gap-2 items-center">
          <div className="w-11 h-11 rounded-full bg-orange-300 flex items-center justify-center text-xl">
            👤
          </div>

          <div className="min-w-0">
            <p className="font-bold truncate">{user.name}</p>
            <p className="text-[10px]">{user.role}</p>
            <p className="text-[10px] text-slate-300 truncate">{user.email}</p>
          </div>
        </div>

        <div className="shrink-0 bg-[#707070] px-2 py-2 flex items-center gap-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none text-white placeholder:text-slate-300"
            placeholder="Rechercher..."
          />
          <span>🔍</span>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto school-scroll pb-3">
          {menus.map((menu) => (
            <div key={menu.title}>
              <div className="bg-[#2f3540] px-2 py-2 font-semibold flex justify-between">
                <span>▣ {menu.title}</span>
                <span>⌃</span>
              </div>

              {menu.items.map((item) => (
                <button
                  key={item}
                  onClick={() => handleMenuClick(item)}
                  className={`w-full text-left pl-8 pr-2 py-[7px] hover:bg-[#b7b7b7] transition ${
                    item === "Liste des inscrits" ? "bg-[#b7b7b7]" : ""
                  }`}
                >
                  - {item}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="shrink-0 p-2">
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-sm font-bold"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}

      <section className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <header className="h-[45px] shrink-0 bg-white border-b flex items-center justify-between px-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden bg-[#2f3540] text-white px-3 py-2 rounded"
            >
              ☰
            </button>

            <h1 className="text-[12px] font-semibold truncate">
              Listes des étudiants({filtered.length})
            </h1>
          </div>

          <div className="top-actions hidden xl:flex items-center gap-[1px]">
            <button
              onClick={() => loadStudents(selectedYear)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-[7px] font-semibold"
            >
              ⟳ Actualiser
            </button>

            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setClasse("TOUT");
                setSerie("TOUT");
              }}
              className="bg-[#1f2937] text-white px-2 py-[7px] font-semibold"
            >
              {schoolYears.length === 0 && (
                <option value="">Année scolaire</option>
              )}

              {schoolYears.map((year) => (
                <option key={year.id} value={year.name}>
                  Année scolaire : {year.name}
                  {year.active ? " (active)" : ""}
                </option>
              ))}
            </select>

            <select className="bg-[#1f2937] text-white px-2 py-[7px] font-semibold">
              <option>Sites : Strelitzia School</option>
            </select>

            <select
              value={classe}
              onChange={(e) => {
                setClasse(e.target.value);
                setSerie("TOUT");
              }}
              className="bg-[#1f2937] text-white px-2 py-[7px] font-semibold"
            >
              <option value="TOUT">Classe : TOUT</option>

              {allClasses.map((c) => (
                <option key={c.id} value={c.name}>
                  Classe : {c.name}
                </option>
              ))}
            </select>

            <select
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              className="bg-[#1f2937] text-white px-2 py-[7px] font-semibold"
            >
              <option value="TOUT">Série : TOUT</option>

              {availableSeries.map((s) => (
                <option key={s.id} value={s.name}>
                  Série : {s.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => alert("Export Excel bientôt disponible")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-[7px]"
            >
              Export Excel
            </button>

            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-[7px]"
            >
              Imprimer PDF
            </button>
          </div>
        </header>

        <div className="search-zone shrink-0 bg-white px-2 py-3 border-b flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-300 px-3 py-2 w-[210px] outline-none"
            placeholder="rechercher..."
          />

          <button
            onClick={() => loadStudents(selectedYear)}
            className="bg-[#1f2937] hover:bg-black text-white px-3 py-2 font-semibold"
          >
            🔍 Rechercher
          </button>

          <button
            onClick={resetFilters}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 font-semibold"
          >
            ✖ Initialiser
          </button>

          <button
            onClick={() => setSidebarOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 lg:hidden"
          >
            ☰ Menu
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto table-scroll bg-white">
         <table className="w-max min-w-[1000px] border-separate border-spacing-0 text-[12px]">
            <thead className="sticky top-0 z-30 bg-[#262b34] text-white shadow-sm">
              <tr>
                {[
                  "Photo",
                  "M°",
                  "Site",
                  "AS",
                  "Date inscription",
                  "Nom",
                  "Prénom(s)",
                  "Sexe",
                  "Classe",
                  "Section",
                  "Contact",
                  "Date Naiss.",
                  "Lieu Naiss.",
                         "-",
                ].map((h) => (
                  <th
                    key={h}
                    className="border border-slate-300 px-3 py-2 text-left whitespace-nowrap font-bold bg-[#262b34]"
                  >
                    {h} ↕
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loadingStudents && (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-slate-500">
                    Chargement des étudiants...
                  </td>
                </tr>
              )}

               {!loadingStudents &&
  filtered.map((s) => (
    <tr
      key={s.id}
      className="odd:bg-[#eaf2fb] even:bg-white hover:bg-yellow-50 leading-none"
    >
      {/* PHOTO */}
      <td className="border border-slate-300 px-[1px] py-[1px] w-[34px] min-w-[34px] max-w-[34px]">
        {s.photoUrl ? (
          <img
            src={s.photoUrl}
            alt={s.nom}
            className="w-7 h-7 rounded-full object-cover border"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-[10px]">
            👤
          </div>
        )}
      </td>

      {/* MATRICULE */}
      <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px] text-red-500 font-medium">
        {s.matricule}
      </td>

      {/* SITE */}
      <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
        {s.site}
      </td>

      {/* ANNEE */}
      <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
        {s.anneeScolaire}
      </td>

      {/* DATE INSCRIPTION */}
      <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
        {formatDate(s.dateInscription)}
      </td>

      {/* NOM */}
      <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px] font-semibold">
        {s.nom}
      </td>

      {/* PRENOMS */}
      <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
        {s.prenoms}
      </td>

      {/* SEXE */}
      <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px] text-center">
        {s.sexe}
      </td>

      {/* CLASSE */}
      <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px] font-medium">
        {s.classe}
      </td>

      {/* SECTION */}
      <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
        {s.section}
      </td>

      {/* CONTACT */}
      <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
        {s.contact || "-"}
      </td>

      {/* DATE NAISSANCE */}
      <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
        {formatDate(s.dateNaissance)}
      </td>

      {/* LIEU */}
      <td className="border border-slate-300 px-[4px] py-[2px] text-[11.5px] max-w-[90px] truncate">
        {s.lieuNaissance || "-"}
      </td>

      {/* ACTION */}
      <td className="border border-slate-300 px-[2px] py-[1px] text-center">
        <div className="relative group inline-block">
          <button className="border border-slate-400 bg-slate-100 hover:bg-slate-200 px-[4px] py-[1px] rounded text-[10px]">
            ▾
          </button>

          <div className="absolute right-0 hidden group-hover:block bg-white shadow-2xl border rounded-md z-50 min-w-[210px] overflow-hidden text-left">
            <button
              onClick={() =>
                (window.location.href = `/user/student/${s.id}`)
              }
              className="w-full text-left px-3 py-2 hover:bg-slate-100 text-[11px]"
            >
              🧑 Information de l’étudiant
            </button>

            <button
              onClick={() => alert("Réinscription bientôt disponible")}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 text-[11px]"
            >
              ↻ Réinscription
            </button>

            <button
              onClick={() => alert("Marquer étudiant bientôt")}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 text-[11px]"
            >
              📑 Marquer l’étudiant
            </button>

            <button
              onClick={() => alert("Transfert bientôt")}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 text-[11px]"
            >
              🔁 Transférer à un site
            </button>

            <button
              onClick={() => deleteStudent(s.id)}
              className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 text-[11px]"
            >
              🗑 Supprimer
            </button>
          </div>
        </div>
      </td>
    </tr>
  ))}

              {!loadingStudents && filtered.length === 0 && (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-slate-500">
                    Aucun étudiant trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="shrink-0 bg-white border-t px-3 py-2 flex justify-between text-[11px]">
          <span>
            Connecté : <b>{user.name}</b> — {user.role}
          </span>
          <span>Strelitzia School © 2026</span>
        </footer>
      </section>
    </main>
  );
}