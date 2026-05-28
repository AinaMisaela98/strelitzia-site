import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const studentId = searchParams.get("studentId")?.trim();

    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: Number(studentId) },
      });

      return NextResponse.json(student ? [student] : []);
    }

    if (!q) return NextResponse.json([]);

    const students = await prisma.student.findMany({
      where: {
        OR: [
          { matricule: { contains: q } },
          { nom: { contains: q } },
          { prenoms: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erreur recherche étudiant" },
      { status: 500 }
    );
  }
}