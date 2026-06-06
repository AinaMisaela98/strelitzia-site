"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  PERMISSION_ROLES,
} from "@/lib/permission-config";

type Permission = {
  id: number;
  role: string;
  module: string;
  action: string;
  allowed: boolean;
};

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");

  async function loadPermissions() {
    setLoading(true);
    const res = await fetch("/api/admin/permissions", { cache: "no-store" });
    const data = await res.json();
    if (data.success) setPermissions(data.permissions || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPermissions();
  }, []);

  const permissionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    permissions.forEach((p) => {
      map.set(`${p.role}:${p.module}:${p.action}`, p.allowed);
    });
    return map;
  }, [permissions]);

  function isChecked(role: string, module: string, action: string) {
    return permissionMap.get(`${role}:${module}:${action}`) === true;
  }

  async function togglePermission(
    role: string,
    module: string,
    action: string,
    allowed: boolean
  ) {
    const key = `${role}:${module}:${action}`;
    setSavingKey(key);

    await fetch("/api/admin/permissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role, module, action, allowed }),
    });

    setPermissions((prev) => {
      const exists = prev.find(
        (p) => p.role === role && p.module === module && p.action === action
      );

      if (exists) {
        return prev.map((p) =>
          p.role === role && p.module === module && p.action === action
            ? { ...p, allowed }
            : p
        );
      }

      return [
        ...prev,
        {
          id: Date.now(),
          role,
          module,
          action,
          allowed,
        },
      ];
    });

    setSavingKey("");
  }

  if (loading) {
    return <div className="p-6">Chargement des permissions...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Permissions utilisateurs</h1>
        <p className="text-sm text-gray-500">
          L’ADMIN garde toujours tous les droits. Les permissions ci-dessous
          concernent les autres rôles.
        </p>
      </div>

      {PERMISSION_ROLES.map((role) => (
        <div key={role} className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">{role}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Module</th>
                  {PERMISSION_ACTIONS.map((action) => (
                    <th key={action.key} className="p-3 text-center">
                      {action.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {PERMISSION_MODULES.map((module) => (
                  <tr key={module.key} className="border-t">
                    <td className="p-3 font-medium">{module.label}</td>

                    {PERMISSION_ACTIONS.map((action) => {
                      const key = `${role}:${module.key}:${action.key}`;
                      const checked = isChecked(role, module.key, action.key);

                      return (
                        <td key={action.key} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={savingKey === key}
                            onChange={(e) =>
                              togglePermission(
                                role,
                                module.key,
                                action.key,
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}