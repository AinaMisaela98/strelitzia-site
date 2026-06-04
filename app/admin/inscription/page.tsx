// app/admin/inscription/page.tsx
import InscriptionWizard from "@/components/InscriptionWizard";

export default function Page() {
  const adminUser = {
    id: 0,
    name: "Administrateur",
    email: "admin@strelitzia.school",
    role: "ADMIN",
  };

  return <InscriptionWizard user={adminUser} />;
}