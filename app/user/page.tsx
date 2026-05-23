import { redirect } from "next/navigation";
import { getAuthUser } from "../../lib/auth";
import UserDashboard from "../../components/UserDashboard";

export default async function UserPage() {
  const user: any = await getAuthUser();

  if (!user) {
    redirect("/");
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  return <UserDashboard user={user} />;
}