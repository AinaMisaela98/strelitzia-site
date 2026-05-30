"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Serie = { id: string | number; name: string };
type ClassRoom = { id: string | number; name: string; series: Serie[] };
type Level = { id: string | number; name: string; classes: ClassRoom[] };
type AcademicsData = { year: string; levels: Level[] };
type ItemType = "level" | "class" | "serie";
type EditState =
  | { type: "level"; id: string | number; name: string }
  | { type: "class"; id: string | number; name: string; levelId?: string | number }
  | { type: "serie"; id: string | number; name: string; classRoomId?: string | number }
  | null;
type DeleteState =
  | { type: ItemType; id: string | number; name: string; label: string; warning?: string }
  | null;

export default function AcademicsPage() {
  const [data, setData] = useState<AcademicsData>({ year: "", levels: [] });
  const [levelName, setLevelName] = useState("");
  const [className, setClassName] = useState("");
  const [serieName, setSerieName] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [edit, setEdit] = useState<EditState>(null);
  const [deleteItem, setDeleteItem] = useState<DeleteState>(null);
  const [notice, setNotice] = useState("");

  async function loadData() {
    try {
      setPageLoading(true);
      const res = await fetch("/api/academics", { cache: "no-store" });
      const json = await res.json();
      setData({ year: json?.year || "", levels: json?.levels || [] });
    } catch (error) {
      alert("Erreur chargement données");
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const classes = useMemo(() => {
    return data.levels.find((l) => String(l.id) === selectedLevel)?.classes || [];
  }, [data.levels, selectedLevel]);

  const allClasses = useMemo(() => {
    return data.levels.flatMap((level) =>
      (level.classes || []).map((classe) => ({ ...classe, levelName: level.name, levelId: level.id }))
    );
  }, [data.levels]);

  const totalSeries = useMemo(() => {
    return data.levels.reduce((sum, level) => sum + level.classes.reduce((s, c) => s + c.series.length, 0), 0);
  }, [data.levels]);

  function showNotice(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 3000);
  }

  async function readResult(res: Response) {
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.error || result.message || "Erreur");
    return result;
  }

  async function apiSave(body: any) {
    const res = await fetch("/api/academics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return readResult(res);
  }

  async function apiUpdate(body: any) {
    const res = await fetch("/api/academics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return readResult(res);
  }

  async function apiDelete(body: { type: ItemType; id: string | number }) {
    const res = await fetch("/api/academics", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return readResult(res);
  }

  async function createItem(type: ItemType) {
    const body: any = { type };

    if (type === "level") body.name = levelName.trim();
    if (type === "class") {
      body.name = className.trim();
      body.levelId = selectedLevel;
    }
    if (type === "serie") {
      body.name = serieName.trim();
      body.classRoomId = selectedClass;
    }

    if (!body.name) return alert("Fenoy aloha ny anarana");
    if (type === "class" && !body.levelId) return alert("Safidio aloha ny niveau");
    if (type === "serie" && !body.classRoomId) return alert("Safidio aloha ny classe");

    setLoading(true);
    try {
      if (type === "serie") {
        const series = serieName
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean);

        if (series.length === 0) return alert("Fenoy aloha ny série");

        for (const name of series) await apiSave({ type: "serie", name, classRoomId: selectedClass });
      } else {
        await apiSave(body);
      }

      if (type === "level") setLevelName("");
      if (type === "class") setClassName("");
      if (type === "serie") setSerieName("");
      await loadData();
      showNotice("Enregistrement effectué");
    } catch (error: any) {
      alert(error.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: NonNullable<EditState>) {
    setEdit(item);
    setDeleteItem(null);
  }

  async function saveEdit() {
    if (!edit) return;
    if (!edit.name.trim()) return alert("Fenoy aloha ny anarana");

    setLoading(true);
    try {
      await apiUpdate({ ...edit, name: edit.name.trim() });
      setEdit(null);
      await loadData();
      showNotice("Modification enregistrée");
    } catch (error: any) {
      alert((error.message || "Erreur modification") + "\n\nRaha tsy mandeha dia mila ampiana méthode PUT ao amin'ny /api/academics.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return;

    setLoading(true);
    try {
      await apiDelete({ type: deleteItem.type, id: deleteItem.id });
      setDeleteItem(null);
      if (edit?.id === deleteItem.id && edit?.type === deleteItem.type) setEdit(null);
      await loadData();
      showNotice("Suppression effectuée");
    } catch (error: any) {
      alert((error.message || "Erreur suppression") + "\n\nRaha tsy mandeha dia mila ampiana méthode DELETE ao amin'ny /api/academics.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-2 py-3 sm:px-4 sm:py-5">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="flex flex-col gap-3 border-b bg-slate-950 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Paramètres académiques</p>
            <h1 className="text-xl font-black sm:text-2xl">Niveaux / Classes / Séries</h1>
            <p className="text-xs font-semibold text-slate-300">Année active : {data.year || "-"}</p>
          </div>
          <button onClick={() => (window.location.href = "/user")} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 shadow sm:w-auto">
            ← Retour
          </button>
        </div>

        {notice && <div className="mx-3 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">✓ {notice}</div>}

        <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 md:grid-cols-3">
          <Box title="Créer niveau" subtitle="Ex: Primaire">
            <Input value={levelName} onChange={setLevelName} placeholder="Nom du niveau" />
            <PrimaryButton loading={loading} onClick={() => createItem("level")}>+ Ajouter</PrimaryButton>
          </Box>

          <Box title="Créer classe" subtitle="Choisir le niveau">
            <Select value={selectedLevel} onChange={(value) => { setSelectedLevel(value); setSelectedClass(""); }}>
              <option value="">Choisir niveau</option>
              {data.levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
            </Select>
            <Input value={className} onChange={setClassName} placeholder="Ex: GRADE 6" />
            <PrimaryButton loading={loading} onClick={() => createItem("class")}>+ Ajouter</PrimaryButton>
          </Box>

          <Box title="Ajouter séries" subtitle="Plusieurs: G6A, G6B">
            <Select value={selectedLevel} onChange={(value) => { setSelectedLevel(value); setSelectedClass(""); }}>
              <option value="">Choisir niveau</option>
              {data.levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
            </Select>
            <Select value={selectedClass} onChange={setSelectedClass}>
              <option value="">Choisir classe</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <textarea
              value={serieName}
              onChange={(e) => setSerieName(e.target.value)}
              placeholder={"G6A, G6B, G6C\nou ligne par ligne"}
              className="mb-2 min-h-[70px] w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <PrimaryButton loading={loading} onClick={() => createItem("serie")}>+ Ajouter</PrimaryButton>
          </Box>
        </div>

        {edit && (
          <div className="mx-3 mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-sm sm:mx-4">
            <p className="mb-2 text-xs font-black text-amber-900">Modifier {edit.type === "level" ? "niveau" : edit.type === "class" ? "classe" : "série"}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1"><Input value={edit.name} onChange={(value) => setEdit({ ...edit, name: value } as EditState)} placeholder="Nouveau nom" /></div>
              <button disabled={loading} onClick={saveEdit} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white disabled:opacity-60">Enregistrer</button>
              <button disabled={loading} onClick={() => setEdit(null)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-60">Annuler</button>
            </div>
          </div>
        )}

        <div className="border-t bg-slate-50 p-3 sm:p-4">
          <div className="mb-3 flex flex-row items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-black text-slate-950">Liste académique</h2>
              <p className="text-[11px] font-bold text-slate-500">{data.levels.length} niveau(x) • {allClasses.length} classe(s) • {totalSeries} série(s)</p>
            </div>
            <button onClick={loadData} className="rounded-xl border bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">Actualiser</button>
          </div>

          {pageLoading ? (
            <p className="rounded-xl bg-white p-5 text-center text-sm font-bold text-slate-500">Chargement...</p>
          ) : data.levels.length === 0 ? (
            <p className="rounded-xl bg-white p-5 text-center text-sm font-bold text-slate-500">Aucun niveau créé.</p>
          ) : (
            <div className="space-y-3">
              {data.levels.map((level) => {
                const levelWarning = level.classes.length > 0 ? `Ce niveau contient ${level.classes.length} classe(s).` : undefined;
                return (
                  <div key={level.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Niveau</p>
                        <h3 className="truncate text-base font-black text-slate-950">{level.name}</h3>
                      </div>
                      <Actions
                        onEdit={() => startEdit({ type: "level", id: level.id, name: level.name })}
                        onDelete={() => setDeleteItem({ type: "level", id: level.id, name: level.name, label: "niveau", warning: levelWarning })}
                      />
                    </div>

                    {level.classes.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-400">Aucune classe</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                        {level.classes.map((c) => {
                          const classWarning = c.series.length > 0 ? `Cette classe contient ${c.series.length} série(s).` : undefined;
                          return (
                            <div key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Classe</p>
                                  <p className="truncate text-sm font-black text-slate-900">{c.name}</p>
                                </div>
                                <Actions
                                  onEdit={() => startEdit({ type: "class", id: c.id, name: c.name, levelId: level.id })}
                                  onDelete={() => setDeleteItem({ type: "class", id: c.id, name: c.name, label: "classe", warning: classWarning })}
                                />
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {c.series.length === 0 && <span className="text-xs font-bold text-slate-400">Aucune série</span>}
                                {c.series.map((s) => (
                                  <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-1 text-[11px] font-black text-blue-800">
                                    {s.name}
                                    <button onClick={() => startEdit({ type: "serie", id: s.id, name: s.name, classRoomId: c.id })} className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700" title="Modifier">✎</button>
                                    <button onClick={() => setDeleteItem({ type: "serie", id: s.id, name: s.name, label: "série" })} className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700" title="Supprimer">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
            <p className="text-sm font-black text-slate-950">Confirmer la suppression</p>
            <p className="mt-2 text-xs font-semibold text-slate-600">Supprimer {deleteItem.label} : <b>{deleteItem.name}</b> ?</p>
            {deleteItem.warning && <p className="mt-2 rounded-xl bg-red-50 p-2 text-xs font-bold text-red-700">Attention : {deleteItem.warning}</p>}
            <div className="mt-4 flex gap-2">
              <button disabled={loading} onClick={() => setDeleteItem(null)} className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-60">Annuler</button>
              <button disabled={loading} onClick={confirmDelete} className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60">{loading ? "Suppression..." : "Supprimer"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Box({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="text-sm font-black text-slate-950">{title}</h2>
      <p className="mb-2 text-[11px] font-semibold text-slate-500">{subtitle}</p>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />;
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{children}</select>;
}

function PrimaryButton({ children, loading, onClick }: { children: ReactNode; loading: boolean; onClick: () => void }) {
  return <button disabled={loading} onClick={onClick} className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60">{loading ? "Miandry..." : children}</button>;
}

function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button onClick={onEdit} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700 shadow-sm">✎</button>
      <button onClick={onDelete} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-black text-red-700 shadow-sm">🗑</button>
    </div>
  );
}
