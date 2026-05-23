import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import StudentDetails from "@/components/StudentDetails";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/");

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (!student) {
    redirect("/user");
  }

  return (
    <StudentDetails
      user={user as any}
      student={student as any}
    />
  );
}