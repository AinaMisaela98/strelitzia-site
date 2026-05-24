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
    <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            S
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mt-5">
            STRELITZIA
          </h1>

          <p className="text-gray-500 mt-2">Connexion espace école</p>
        </div>

       <form
  onSubmit={handleLogin}
  autoComplete="off"
  className="space-y-5"
>
  <div>
    <label className="text-sm font-semibold text-gray-700">
      Email
    </label>

    <input
      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
    <label className="text-sm font-semibold text-gray-700">
      Mot de passe
    </label>

    <input
      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-bold transition disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}