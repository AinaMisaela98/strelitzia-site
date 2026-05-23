"use client";

import { useEffect, useState } from "react";

export default function AcademicsPage() {
  const [data, setData] = useState<any>({ year: "", levels: [] });
  const [levelName, setLevelName] = useState("");
  const [className, setClassName] = useState("");
  const [serieName, setSerieName] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData() {
    const res = await fetch("/api/academics", { cache: "no-store" });
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createItem(type: "level" | "class" | "serie") {
    const body: any = { type };

    if (type === "level") body.name = levelName;
    if (type === "class") {
      body.name = className;
      body.levelId = selectedLevel;
    }
    if (type === "serie") {
      body.name = serieName;
      body.classRoomId = selectedClass;
    }

    if (!body.name) {
      alert("Fenoy aloha ny anarana");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/academics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(result.error || "Erreur");
      return;
    }

    setLevelName("");
    setClassName("");
    setSerieName("");
    await loadData();
  }

  const classes =
    data.levels.find((l: any) => String(l.id) === selectedLevel)?.classes || [];

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow border overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black">Niveaux / Classes / Séries</h1>
            <p className="text-slate-500">Année scolaire active : {data.year}</p>
          </div>

          <button
            onClick={() => (window.location.href = "/user")}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl"
          >
            Retour
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 border-b">
          <Box title="Créer niveau">
            <input
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              placeholder="Ex: Primaire"
              className="w-full border rounded-xl px-4 py-3 mb-3"
            />
            <button
              disabled={loading}
              onClick={() => createItem("level")}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-60"
            >
              Ajouter niveau
            </button>
          </Box>

          <Box title="Créer classe">
            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value);
                setSelectedClass("");
              }}
              className="w-full border rounded-xl px-4 py-3 mb-3"
            >
              <option value="">Choisir niveau</option>
              {data.levels.map((level: any) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>

            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Ex: GRADE 6"
              className="w-full border rounded-xl px-4 py-3 mb-3"
            />

            <button
              disabled={loading}
              onClick={() => createItem("class")}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold disabled:opacity-60"
            >
              Ajouter classe
            </button>
          </Box>

          <Box title="Créer série / section">
            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value);
                setSelectedClass("");
              }}
              className="w-full border rounded-xl px-4 py-3 mb-3"
            >
              <option value="">Choisir niveau</option>
              {data.levels.map((level: any) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 mb-3"
            >
              <option value="">Choisir classe</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              value={serieName}
              onChange={(e) => setSerieName(e.target.value)}
              placeholder="Ex: G6A"
              className="w-full border rounded-xl px-4 py-3 mb-3"
            />

            <button
              disabled={loading}
              onClick={() => createItem("serie")}
              className="w-full bg-violet-600 text-white py-3 rounded-xl font-bold disabled:opacity-60"
            >
              Ajouter série
            </button>
          </Box>
        </div>

        <div className="p-6">
          {data.levels.map((level: any) => (
            <div key={level.id} className="mb-6 border rounded-2xl p-5 bg-slate-50">
              <h2 className="text-xl font-black mb-3">{level.name}</h2>

              {level.classes.map((c: any) => (
                <div key={c.id} className="mb-3 bg-white rounded-xl p-4 border">
                  <p className="font-bold text-slate-800">{c.name}</p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {c.series.map((s: any) => (
                      <span
                        key={s.id}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold"
                      >
                        {s.name}
                      </span>
                    ))}

                    {c.series.length === 0 && (
                      <span className="text-slate-400 text-sm">Aucune série</span>
                    )}
                  </div>
                </div>
              ))}

              {level.classes.length === 0 && (
                <p className="text-slate-500">Aucune classe</p>
              )}
            </div>
          ))}

          {data.levels.length === 0 && (
            <p className="text-center text-slate-500 p-8">
              Aucun niveau créé pour cette année scolaire active.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function Box({ title, children }: any) {
  return (
    <div className="border rounded-2xl p-5 bg-white shadow-sm">
      <h2 className="font-black mb-4">{title}</h2>
      {children}
    </div>
  );
}