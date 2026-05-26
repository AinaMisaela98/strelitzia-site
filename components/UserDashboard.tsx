"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const [openActionId, setOpenActionId] = useState<string | number | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [selectedYear, setSelectedYear] = useState("2025-2026");

  const [academics, setAcademics] = useState<{ levels: AcademicLevel[] }>({
    levels: [],
  });

  const [search, setSearch] = useState("");
  const [classe, setClasse] = useState("TOUT");
  const [serie, setSerie] = useState("TOUT");

  const loadingStudentsRef = useRef(false);
  const loadingAcademicsRef = useRef(false);
  const initializedRef = useRef(false);

  async function loadSchoolYears() {
    try {
      const res = await fetch("/api/school-years", { cache: "no-store" });
      const data = await res.json();

      if (Array.isArray(data)) {
        setSchoolYears(data);
        const active = data.find((y: SchoolYear) => y.active);
        return active?.name || data[0]?.name || "2025-2026";
      }

      return "2025-2026";
    } catch {
      setSchoolYears([]);
      return "2025-2026";
    }
  }

  async function loadAcademics(yearParam?: string) {
    if (loadingAcademicsRef.current) return;

    try {
      loadingAcademicsRef.current = true;
      const yearToUse = yearParam || selectedYear;
      if (!yearToUse) return;

      const res = await fetch(
        `/api/academics?year=${encodeURIComponent(yearToUse)}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setAcademics({
        levels: Array.isArray(data?.levels)
          ? data.levels
          : Array.isArray(data)
          ? data
          : [],
      });
    } catch {
      setAcademics({ levels: [] });
    } finally {
      loadingAcademicsRef.current = false;
    }
  }

  async function loadStudents(yearParam?: string) {
    if (loadingStudentsRef.current) return;

    try {
      loadingStudentsRef.current = true;
      setLoadingStudents(true);

      const yearToUse = yearParam || selectedYear;
      if (!yearToUse) return;

      const res = await fetch(
        `/api/students?year=${encodeURIComponent(yearToUse)}`,
        { cache: "no-store" }
      );

      const data = await res.json();
      setStudents(Array.isArray(data) ? data : data.students || []);
    } catch (error) {
      console.error(error);
    } finally {
      loadingStudentsRef.current = false;
      setLoadingStudents(false);
    }
  }

  useEffect(() => {
    async function initDashboard() {
      const yearToUse = await loadSchoolYears();

      setSelectedYear(yearToUse);
      setClasse("TOUT");
      setSerie("TOUT");

      await Promise.all([loadStudents(yearToUse), loadAcademics(yearToUse)]);

      initializedRef.current = true;
    }

    initDashboard();
  }, []);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (!selectedYear) return;

    setClasse("TOUT");
    setSerie("TOUT");

    Promise.all([loadStudents(selectedYear), loadAcademics(selectedYear)]);
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

  function exportExcel() {
    const rows = filtered.map((s) => ({
      Matricule: s.matricule || "",
      Nom: s.nom || "",
      Prenoms: s.prenoms || "",
      Classe: s.classe || "",
      Serie: s.section || "",
      Telephone: s.contact || "",
    }));

    import("xlsx").then((XLSX) => {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Etudiants");
      XLSX.writeFile(workbook, `etudiants_${selectedYear || "2025-2026"}.xlsx`);
    });
  }

  function printStudents() {
    const byClass = filtered.reduce((acc: any, s: any) => {
      const key = s.classe || "Sans classe";
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});

    const html = `
      <html>
        <head>
          <title>Liste des étudiants</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 12px; }
            .page { page-break-after: always; max-width: 100%; }
            .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
            .school { font-size: 22px; font-weight: 900; color: #dc2626; }
            .sub { font-size: 13px; color: #16a34a; font-weight: 700; }
            .meta { margin-top: 8px; font-size: 12px; color: #374151; }
            .class-box { margin: 14px 0 18px 0; padding: 12px; border-radius: 12px; background: linear-gradient(to right, #0f172a, #1e293b); color: white; }
            .class-title { font-size: 20px; font-weight: 900; margin-bottom: 6px; }
            .badges { display:flex; gap:8px; flex-wrap:wrap; font-size:12px; }
            .badge { padding:6px 10px; border-radius:999px; font-weight:700; }
            .blue { background:#2563eb; }
            .green { background:#16a34a; }
            .red { background:#dc2626; }
            .table-wrap { width: 100%; overflow-x: auto; }
            table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
            th { background: #111827; color: white; padding: 6px; border: 1px solid #111827; text-align: left; }
            td { padding: 5px; border: 1px solid #cbd5e1; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 12px; font-size: 11px; color: #64748b; text-align: right; }

            @media screen and (max-width: 700px) {
              body { padding: 8px; }
              .school { font-size: 18px; }
              .class-title { font-size: 16px; }
              table { font-size: 9.5px; min-width: 760px; }
            }

            @media print {
              body { padding: 0; }
              table { font-size: 10px; }
            }
          </style>
        </head>
        <body>
          ${Object.entries(byClass)
            .map(
              ([classeName, students]: any) => `
              <div class="page">
                <div class="header">
                  <div class="school">STRELITZIA SCHOOL</div>
                  <div class="sub">Liste des étudiants par classe</div>
                  <div class="meta">
                    Année scolaire : ${selectedYear || "2025-2026"} |
                    Classe : ${classeName} |
                    Effectif : ${students.length}
                  </div>
                </div>

                <div class="class-box">
                  <div class="class-title">Classe : ${classeName}</div>
                  <div class="badges">
                    <div class="badge blue">Série : ${
                      serie === "TOUT" ? "Toutes les séries" : serie
                    }</div>
                    <div class="badge green">Effectif : ${
                      students.length
                    } étudiant(s)</div>
                    <div class="badge red">Année : ${
                      selectedYear || "2025-2026"
                    }</div>
                  </div>
                </div>

                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Matricule</th>
                        <th>Nom</th>
                        <th>Prénoms</th>
                        <th>Date naissance</th>
                        <th>Sexe</th>
                        <th>Série</th>
                        <th>Téléphone</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${students
                        .map(
                          (s: any, i: number) => `
                        <tr>
                          <td>${i + 1}</td>
                          <td>${s.matricule || ""}</td>
                          <td>${s.nom || ""}</td>
                          <td>${s.prenoms || ""}</td>
                          <td>${
                            s.dateNaissance
                              ? new Date(s.dateNaissance).toLocaleDateString(
                                  "fr-FR"
                                )
                              : ""
                          }</td>
                          <td>${s.sexe || ""}</td>
                          <td>${s.section || ""}</td>
                          <td>${s.contact || ""}</td>
                        </tr>
                      `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>

                <div class="footer">
                  Imprimé le ${new Date().toLocaleDateString("fr-FR")}
                </div>
              </div>
            `
            )
            .join("")}
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return alert("Popup bloqué");

    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
    }, 500);
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
        className={`fixed lg:relative z-50 h-full w-[260px] lg:w-[215px] shrink-0 bg-[#4a4a4a] text-white flex flex-col border-r border-slate-600 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-[68px] shrink-0 bg-white flex items-center justify-between px-3 border-b">
          <div className="leading-none">
            <div className="text-[19px] font-black text-red-600">STRELITZIA</div>
            <div className="text-[13px] font-black text-green-600">SCHOOL</div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-700 text-xl"
          >
            ✕
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
                  onClick={() => {
                    setSidebarOpen(false);
                    handleMenuClick(item);
                  }}
                  className={`w-full text-left pl-8 pr-2 py-[8px] hover:bg-[#b7b7b7] transition ${
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
        <header className="shrink-0 bg-[#f8fafc] border-b border-slate-200 px-2 sm:px-3 md:px-5 py-3 md:py-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden bg-[#2f3540] text-white px-3 py-2 rounded-xl"
                >
                  ☰
                </button>

                <div className="min-w-0">
                  <h1 className="text-[15px] md:text-[18px] font-black text-slate-800 truncate">
                    Liste des étudiants
                  </h1>
                  <p className="text-[11px] md:text-[12px] text-slate-500 font-semibold">
                    {filtered.length} étudiant{filtered.length > 1 ? "s" : ""} inscrit
                    {filtered.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="shrink-0 bg-blue-600 text-white rounded-xl px-3 py-2 text-[12px] font-black shadow-sm">
                Total : {filtered.length}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex xl:flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  loadSchoolYears();
                  loadStudents(selectedYear);
                  loadAcademics(selectedYear);
                }}
                className="h-[40px] px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[12px] font-bold whitespace-nowrap transition shadow-sm"
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
                className="h-[40px] w-full xl:w-[210px] rounded-xl bg-[#1f2937] text-white px-3 text-[12px] font-bold outline-none border border-slate-700"
              >
                {schoolYears.length === 0 && <option value="">Année scolaire</option>}

                {schoolYears.map((year) => (
                  <option key={year.id} value={year.name}>
                    Année scolaire : {year.name}
                    {year.active ? " (active)" : ""}
                  </option>
                ))}
              </select>

              <div className="h-[40px] rounded-xl bg-slate-100 border border-slate-200 text-slate-800 px-3 flex items-center text-[12px] font-bold whitespace-nowrap">
                Sites : Strelitzia School
              </div>

              <select
                value={classe}
                onChange={(e) => {
                  setClasse(e.target.value);
                  setSerie("TOUT");
                }}
                className="h-[40px] w-full xl:w-[165px] rounded-xl bg-[#1f2937] text-white px-3 text-[12px] font-bold outline-none border border-slate-700"
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
                className="h-[40px] w-full xl:w-[155px] rounded-xl bg-[#1f2937] text-white px-3 text-[12px] font-bold outline-none border border-slate-700"
              >
                <option value="TOUT">Série : TOUT</option>

                {availableSeries.map((s) => (
                  <option key={`${s.id}-${s.name}`} value={s.name}>
                    Série : {s.name}
                  </option>
                ))}
              </select>

              <button
                onClick={exportExcel}
                className="h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold whitespace-nowrap transition shadow-sm"
              >
                Export Excel
              </button>

              <button
                onClick={printStudents}
                className="h-[40px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold whitespace-nowrap transition shadow-sm"
              >
                Imprimer PDF
              </button>
            </div>
          </div>
        </header>

        <div className="search-zone shrink-0 bg-white px-2 sm:px-3 py-3 border-b flex flex-col sm:flex-row gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-300 px-3 py-2 w-full sm:w-[260px] outline-none rounded-lg"
            placeholder="rechercher..."
          />

          <div className="flex gap-2">
            <button
              onClick={() => loadStudents(selectedYear)}
              className="flex-1 sm:flex-none bg-[#1f2937] hover:bg-black text-white px-3 py-2 font-semibold rounded-lg"
            >
              🔍 Rechercher
            </button>

            <button
              onClick={resetFilters}
              className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white px-3 py-2 font-semibold rounded-lg"
            >
              ✖ Initialiser
            </button>
          </div>
        </div>

        <div className="hidden md:block flex-1 min-h-0 overflow-auto table-scroll bg-white">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[12px]">
            <thead className="sticky top-0 z-30 bg-[#262b34] text-white shadow-sm">
              <tr>
                {[
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
              {loadingStudents ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-500">
                    Chargement...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-500">
                    Aucun étudiant trouvé
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="odd:bg-[#eaf2fb] even:bg-white hover:bg-yellow-50 leading-none"
                  >
                    <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px] text-red-500 font-medium">
                      {s.matricule}
                    </td>
                    <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
                      {s.site}
                    </td>
                    <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
                      {s.anneeScolaire}
                    </td>
                    <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
                      {formatDate(s.dateInscription)}
                    </td>
                    <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px] font-semibold">
                      {s.nom}
                    </td>
                    <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
                      {s.prenoms}
                    </td>
                    <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px] text-center">
                      {s.sexe}
                    </td>
                    <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px] font-medium">
                      {s.classe}
                    </td>
                    <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
                      {s.section}
                    </td>
                    <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
                      {s.contact || "-"}
                    </td>
                    <td className="border border-slate-300 px-[4px] py-[2px] whitespace-nowrap text-[11.5px]">
                      {formatDate(s.dateNaissance)}
                    </td>
                    <td className="border border-slate-300 px-[4px] py-[2px] text-[11.5px] max-w-[90px] truncate">
                      {s.lieuNaissance || "-"}
                    </td>
                    <td className="border border-slate-300 px-[2px] py-[1px] text-center">
                      <ActionMenu
                        student={s}
                        openActionId={openActionId}
                        setOpenActionId={setOpenActionId}
                        deleteStudent={deleteStudent}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex-1 min-h-0 overflow-auto bg-[#eef2f7] p-3 space-y-3">
          {loadingStudents ? (
            <div className="bg-white rounded-2xl p-5 text-center text-slate-500 shadow-sm border">
              Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center text-slate-500 shadow-sm border">
              Aucun étudiant trouvé
            </div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-black text-slate-900 truncate">
                      {s.nom} {s.prenoms}
                    </p>
                    <p className="text-[11px] font-bold text-red-500">
                      {s.matricule}
                    </p>
                  </div>

                  <ActionMenu
                    student={s}
                    openActionId={openActionId}
                    setOpenActionId={setOpenActionId}
                    deleteStudent={deleteStudent}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <MobileInfo label="Classe" value={s.classe} />
                  <MobileInfo label="Série" value={s.section} />
                  <MobileInfo label="Sexe" value={s.sexe} />
                  <MobileInfo label="Contact" value={s.contact || "-"} />
                  <MobileInfo label="Naissance" value={formatDate(s.dateNaissance)} />
                  <MobileInfo label="AS" value={s.anneeScolaire} />
                </div>

                <button
                  onClick={() => (window.location.href = `/user/student/${s.id}`)}
                  className="mt-3 w-full bg-slate-900 text-white py-2 rounded-xl font-bold text-[12px]"
                >
                  Voir la fiche étudiant
                </button>
              </div>
            ))
          )}
        </div>

        <footer className="shrink-0 bg-white border-t px-3 py-2 flex flex-col sm:flex-row justify-between gap-1 text-[11px]">
          <span>
            Connecté : <b>{user.name}</b> — {user.role}
          </span>
          <span>Strelitzia School © 2026</span>
        </footer>
      </section>
    </main>
  );
}

function MobileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-w-0">
      <p className="text-[10px] text-slate-500 font-bold uppercase">{label}</p>
      <p className="font-bold text-slate-800 truncate">{value || "-"}</p>
    </div>
  );
}

function ActionMenu({
  student,
  openActionId,
  setOpenActionId,
  deleteStudent,
}: {
  student: Student;
  openActionId: string | number | null;
  setOpenActionId: (id: string | number | null) => void;
  deleteStudent: (id: number) => void;
}) {
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() =>
          setOpenActionId(openActionId === student.id ? null : student.id)
        }
        className="border border-slate-400 bg-slate-100 hover:bg-slate-200 active:scale-95 transition px-2 py-1 rounded text-[11px]"
      >
        ▾
      </button>

      {openActionId === student.id && (
        <>
          <div onClick={() => setOpenActionId(null)} className="fixed inset-0 z-40" />

          <div className="absolute right-0 mt-1 bg-white shadow-2xl border border-slate-200 rounded-xl z-50 w-[230px] max-w-[80vw] overflow-hidden text-left">
            <button
              type="button"
              onClick={() => {
                setOpenActionId(null);
                window.location.href = `/user/student/${student.id}`;
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-100 text-[12px] font-medium"
            >
              🧑 Information de l’étudiant
            </button>

            <button
              type="button"
              onClick={() => {
                setOpenActionId(null);
                alert("Réinscription bientôt disponible");
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-100 text-[12px] font-medium"
            >
              ↻ Réinscription
            </button>

            <button
              type="button"
              onClick={() => {
                setOpenActionId(null);
                alert("Marquer étudiant bientôt");
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-100 text-[12px] font-medium"
            >
              📑 Marquer l’étudiant
            </button>

            <button
              type="button"
              onClick={() => {
                setOpenActionId(null);
                alert("Transfert bientôt");
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-100 text-[12px] font-medium"
            >
              🔁 Transférer à un site
            </button>

            <button
              type="button"
              onClick={() => {
                setOpenActionId(null);
                deleteStudent(student.id);
              }}
              className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 text-[12px] font-semibold"
            >
              🗑 Supprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
}