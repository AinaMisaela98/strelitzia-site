"use client";

import { useEffect, useState } from "react";

type SchoolYear = {
  id: number;
  name: string;
  active: boolean;
};

export default function SchoolYearsPage() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [name, setName] = useState("");

  async function loadYears() {
    const res = await fetch("/api/school-years");
    const data = await res.json();
    setYears(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadYears();
  }, []);

  async function createYear(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Soraty aloha ny année scolaire");
      return;
    }

    const res = await fetch("/api/school-years", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      alert("Erreur création année scolaire");
      return;
    }

    setName("");
    loadYears();
  }

  async function activateYear(id: number) {
    const res = await fetch(`/api/school-years/${id}/activate`, {
      method: "PUT",
    });

    if (!res.ok) {
      alert("Erreur activation");
      return;
    }

    loadYears();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow border overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black">Années scolaires</h1>
            <p className="text-slate-500">
              Choisir l’année active pour les inscriptions et la liste des étudiants.
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/user")}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl"
          >
            Retour
          </button>
        </div>

        <form onSubmit={createYear} className="p-6 border-b flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: 2026-2027"
            className="flex-1 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold">
            + Ajouter
          </button>
        </form>

        <div className="p-6">
          <table className="w-full border">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-3 text-left">Année scolaire</th>
                <th className="p-3 text-left">Statut</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {years.map((year) => (
                <tr key={year.id} className="border-b">
                  <td className="p-3 font-bold">{year.name}</td>

                  <td className="p-3">
                    {year.active ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                        Active
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    {!year.active && (
                      <button
                        onClick={() => activateYear(year.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg"
                      >
                        Activer
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {years.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-slate-500">
                    Aucune année scolaire
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}