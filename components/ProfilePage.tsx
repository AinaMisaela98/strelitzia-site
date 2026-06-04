"use client";

import { useState } from "react";

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  profilePhoto?: string | null;
  mustChangePassword?: boolean;
};

export default function ProfilePage({ user }: { user: AuthUser }) {
  const safeUser = user || {
    id: 0,
    name: "Utilisateur",
    email: "",
    role: "USER",
    profilePhoto: null,
  };

  const [photo, setPhoto] = useState(safeUser.profilePhoto || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadPhoto(file: File) {
    setLoadingPhoto(true);
    setMessage("");

    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch("/api/users/profile-photo", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    setLoadingPhoto(false);

    if (!res.ok) {
      setMessage(data.error || "Erreur upload photo");
      return;
    }

    setPhoto(data.profilePhoto);
    setMessage("Photo de profil mise à jour");
  }

  async function changePassword() {
    setLoadingPassword(true);
    setMessage("");

    const res = await fetch("/api/users/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    const data = await res.json().catch(() => ({}));
    setLoadingPassword(false);

    if (!res.ok) {
      setMessage(data.error || "Erreur modification mot de passe");
      return;
    }

    setOldPassword("");
    setNewPassword("");
    setMessage("Mot de passe modifié avec succès");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 text-slate-900 md:p-6">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="bg-slate-950 p-5 text-white md:p-7">
          <p className="text-[11px] font-black uppercase tracking-[.25em] text-slate-400">
            Compte utilisateur
          </p>
          <h1 className="mt-1 text-2xl font-black">Mon profil</h1>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            Photo de profil et modification du mot de passe.
          </p>
        </div>

        <div className="p-4 md:p-7">
          {message && (
            <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              {message}
            </div>
          )}

          <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
            {photo ? (
              <img
                src={photo}
                alt="Photo profil"
                className="h-24 w-24 rounded-full border border-slate-200 object-cover shadow-sm"
              />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-full bg-slate-900 text-3xl font-black text-white shadow-sm">
                {String(safeUser.name || "U").slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-black">{safeUser.name}</p>
              <p className="truncate text-sm font-bold text-slate-500">{safeUser.email}</p>
              <p className="mt-1 w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                {safeUser.role}
              </p>

              <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:brightness-110">
                {loadingPhoto ? "Upload..." : "Changer photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPhoto(file);
                  }}
                />
              </label>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 p-4">
            <h2 className="text-lg font-black">Modifier mot de passe</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Après une réinitialisation par Admin, l’ancien mot de passe n’est pas obligatoire.
            </p>

            <div className="mt-4 grid gap-3">
              <input
                type="password"
                placeholder="Ancien mot de passe"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-blue-100"
              />

              <input
                type="password"
                placeholder="Nouveau mot de passe minimum 6 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-blue-100"
              />

              <button
                onClick={changePassword}
                disabled={loadingPassword}
                className="rounded-xl bg-blue-700 px-4 py-3 font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingPassword ? "Enregistrement..." : "Enregistrer le mot de passe"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
