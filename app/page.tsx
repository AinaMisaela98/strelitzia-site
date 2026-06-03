"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur login");
        setLoading(false);
        return;
      }

      const role = String(data.role || "").toUpperCase();

      if (role === "ADMIN") {
        window.location.replace("/admin");
        return;
      }

      window.location.replace("/user");
    } catch {
      setError("Erreur serveur");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-[430px] rounded-[28px] bg-white shadow-2xl border border-white/20 p-7 sm:p-8">
        <div className="text-center mb-7">
          <img
            src="/strelitzia.png"
            alt="Strelitzia School"
            className="mx-auto h-24 w-24 object-contain mb-4"
          />

          <p className="text-[12px] font-black uppercase tracking-[0.25em] text-blue-600">
            Bienvenue
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-900">
            STRELITZIA
          </h1>

          <p className="mt-2 text-sm font-medium text-slate-500">
            Connexion espace école
          </p>
        </div>

        <form onSubmit={handleLogin} autoComplete="off" className="space-y-5">
          <div>
            <label className="text-sm font-bold text-slate-700">Email</label>

            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="strelitzia_email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Mot de passe
            </label>

            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="strelitzia_password"
              required
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 py-3.5 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}