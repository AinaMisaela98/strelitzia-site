import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import InscriptionWizard from "@/components/InscriptionWizard";

export default async function InscriptionPage() {
  const user = await getAuthUser();

  if (!user) redirect("/");
  if ((user as any).role === "ADMIN") redirect("/admin");

  return <InscriptionWizard user={user as any} />;
}