"use client";

import { useEffect, useMemo, useState } from "react";

type Permission = {
  role: string;
  module: string;
  action: string;
  allowed: boolean;
};

export function usePermissions() {
  const [role, setRole] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/me/permissions", { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setRole(data.role);
        setIsAdmin(data.isAdmin);
        setPermissions(data.permissions || []);
      }

      setLoading(false);
    }

    load();
  }, []);

  const can = useMemo(() => {
    return (module: string, action: string) => {
      if (isAdmin) return true;

      return permissions.some(
        (p) =>
          p.module === module &&
          p.action === action &&
          p.allowed === true
      );
    };
  }, [isAdmin, permissions]);

  return { role, isAdmin, permissions, loading, can };
}