"use client";

import { useEffect, useState } from "react";

const MONTHS = ["DI", "FG", "UNIF", "SEPT", "OCT", "NOV", "DEC", "JAN", "FEV", "MAR", "AVR", "MAI", "JUIN"];

export default function EtatPaiementFraisPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    schoolYearId: "",
    siteId: "",
    classId: "",
    serieId: "",
    feeModelId: "",
    etat: "",
    matricule: "",
  });

  async function loadData() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const res = await fetch(`/api/fee-payment-status?${params.toString()}`);
    const data = await res.json();
    setRows(data.rows || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetFilters() {
    setFilters({
      schoolYearId: "",
      siteId: "",
      classId: "",
      serieId: "",
      feeModelId: "",
      etat: "",
      matricule: "",
    });
    setTimeout(loadData, 50);
  }

  return (
    <div className="p-3 bg-white min-h-screen text-[12px]">
      <div className="flex flex-wrap items-center gap-1 mb-3">
        <h1 className="text-[18px] font-semibold mr-3">
          Etat paiement des frais
        </h1>

        <button onClick={loadData} className="bg-cyan-600 text-white px-3 py-2 rounded">
          🔄 Actualiser
        </button>

        <select className="bg-slate-800 text-white px-2 py-2 rounded">
          <option>Année scolaire : 2025-2026</option>
        </select>

        <select className="bg-slate-800 text-white px-2 py-2 rounded">
          <option>Sites : Strelitzia School</option>
        </select>

        <select className="bg-slate-800 text-white px-2 py-2 rounded">
          <option>Classe : TOUT</option>
        </select>

        <select className="bg-slate-800 text-white px-2 py-2 rounded">
          <option>Série :</option>
        </select>

        <select className="bg-slate-800 text-white px-2 py-2 rounded">
          <option>Frais Formation : TOUT</option>
        </select>

        <select
          value={filters.etat}
          onChange={(e) => setFilters({ ...filters, etat: e.target.value })}
          className="bg-slate-800 text-white px-2 py-2 rounded"
        >
          <option value="">Etat : TOUT</option>
          <option value="PAYE">Payé</option>
          <option value="NON_PAYE">Non payé</option>
        </select>

        <button className="bg-blue-600 text-white px-3 py-2 rounded">
          Export Excel
        </button>
      </div>

      <div className="flex gap-1 mb-2">
        <input
          value={filters.matricule}
          onChange={(e) => setFilters({ ...filters, matricule: e.target.value })}
          placeholder="numero matricule"
          className="border px-2 py-2 w-[180px]"
        />

        <button onClick={loadData} className="bg-slate-800 text-white px-3 rounded">
          🔍 Rechercher
        </button>

        <button onClick={resetFilters} className="bg-red-500 text-white px-3 rounded">
          ✖ Initialiser
        </button>
      </div>

      <div className="overflow-x-auto border">
        <table className="w-full border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="border px-2 py-2 text-left">Matricule</th>
              <th className="border px-2 py-2 text-left">Date Inscription</th>
              <th className="border px-2 py-2 text-left">Nom et Prénom(s)</th>
              <th className="border px-2 py-2 text-left">Série</th>
              {MONTHS.map((m) => (
                <th key={m} className="border px-2 py-2 text-center">
                  {m}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((s, index) => (
              <tr key={s.id} className={index % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                <td className="border px-2 py-1 text-blue-600 font-semibold">{s.matricule}</td>
                <td className="border px-2 py-1">
                  {new Date(s.dateInscription).toLocaleDateString("fr-FR")}
                </td>
                <td className="border px-2 py-1">{s.fullName}</td>
                <td className="border px-2 py-1">{s.serie}</td>

                {MONTHS.map((m) => (
                  <td
                    key={m}
                    className={`border text-center font-bold ${
                      s.status[m] ? "bg-green-500 text-white" : "bg-yellow-200 text-red-600"
                    }`}
                  >
                    {s.status[m] ? "✓" : "!"}
                  </td>
                ))}
              </tr>
            ))}

            <tr className="bg-slate-200 font-bold text-blue-600">
              <td colSpan={4} className="border px-2 py-2 text-right">
                Total non payé
              </td>
              {MONTHS.map((m) => (
                <td key={m} className="border text-center">
                  {rows.filter((r) => !r.status[m]).length}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}