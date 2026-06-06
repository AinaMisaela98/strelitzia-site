export const PERMISSION_ROLES = ["DIRECTEUR", "SECRETAIRE"] as const;

export const PERMISSION_MODULES = [
  { key: "students", label: "Étudiants" },
  { key: "registrations", label: "Inscriptions" },
  { key: "reinscriptions", label: "Réinscriptions" },
  { key: "fee_models", label: "Modèles de frais" },
  { key: "training_fees", label: "Frais de formation" },
  { key: "payments", label: "Paiements des frais" },
  { key: "treasury", label: "Trésorerie" },
  { key: "treasury_movements", label: "Mouvements trésorerie" },
  { key: "school_years", label: "Années scolaires" },
  { key: "users", label: "Utilisateurs" },
  { key: "settings", label: "Paramètres" },
] as const;

export const PERMISSION_ACTIONS = [
  { key: "view", label: "Voir" },
  { key: "create", label: "Ajouter" },
  { key: "edit", label: "Modifier" },
  { key: "delete", label: "Supprimer" },
  { key: "print", label: "Imprimer" },
  { key: "duplicate", label: "Dupliquer" },
  { key: "cancel_payment", label: "Annuler paiement" },
  { key: "export", label: "Exporter" },
] as const;