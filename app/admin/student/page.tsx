// app/admin/page.tsx
import UserDashboard from "@/components/UserDashboard";

export default function Page() {
  const adminUser = {
    id: 0,
    name: "Administrateur",
    email: "admin@strelitzia.school",
    role: "ADMIN",
  };

  return <UserDashboard user={adminUser} />;
}