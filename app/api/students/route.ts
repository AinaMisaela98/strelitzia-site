import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cleanDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getActiveSchoolYearName(): Promise<string> {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { active: true },
    select: { name: true },
  });

  return activeYear?.name || "2025-2026";
}

const studentSelect = {
  id: true,
  matricule: true,
  site: true,
  anneeScolaire: true,
  dateInscription: true,
  photoUrl: true,
  nom: true,
  prenoms: true,
  sexe: true,
  classe: true,
  section: true,
  contact: true,
  dateNaissance: true,
  lieuNaissance: true,
} as const;

export async function GET(req: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const url = new URL(req.url);
    const year = cleanString(url.searchParams.get("year"));
    const selectedYear = year || (await getActiveSchoolYearName());

    const students = await prisma.student.findMany({
      where: {
        anneeScolaire: selectedYear,
      },
      select: studentSelect,
      orderBy: {
        id: "desc",
      },
      take: 500,
    });

    return NextResponse.json(
      { students },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/students error:", error);

    return NextResponse.json(
      {
        error:
          error?.code === "P2024"
            ? "Base de données occupée. Réessayez dans quelques secondes."
            : error?.code === "P1017"
            ? "Connexion base de données fermée. Vérifiez Supabase."
            : "Erreur récupération étudiants",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();

    const matricule = cleanString(body.matricule);
    const nom = cleanString(body.nom);
    const prenoms = cleanString(body.prenoms);
    const classe = cleanString(body.classe);
    const section = cleanString(body.section);

    if (!matricule || !nom || !prenoms || !classe || !section) {
      return NextResponse.json(
        {
          error:
            "Champs obligatoires incomplets: matricule, nom, prénoms, classe, section.",
        },
        { status: 400 }
      );
    }

    const activeYearName =
      cleanString(body.anneeScolaire) || (await getActiveSchoolYearName());

    const student = await prisma.student.create({
      data: {
        matricule,
        site: cleanString(body.site) || "Strelitzia School",
        anneeScolaire: activeYearName,
        dateInscription: cleanDate(body.dateInscription) || new Date(),

        photoUrl: cleanString(body.photoUrl),

        nom,
        prenoms,
        sexe: body.sexe === "Feminin" ? "Feminin" : "Masculin",
        classe,
        section,

        contact: cleanString(body.telephone || body.contact),
        dateNaissance: cleanDate(body.dateNaissance),
        lieuNaissance: cleanString(body.lieuNaissance),
        adresse: cleanString(body.adresse),

        signeParticulier: cleanString(body.signeParticulier),
        maladieAllergie: cleanString(body.maladieAllergie),
        email: cleanString(body.email),

        pereNom: cleanString(body.pereNom),
        pereTel: cleanString(body.pereTel),
        mereNom: cleanString(body.mereNom),
        mereTel: cleanString(body.mereTel),
        parentAdresse: cleanString(body.parentAdresse),

        tuteurNom: cleanString(body.tuteurNom),
        tuteurLien: cleanString(body.tuteurLien),
        tuteurTel: cleanString(body.tuteurTel),
        tuteurAdresse: cleanString(body.tuteurAdresse),

        niveau: cleanString(body.niveau),
        fraisInscription: cleanString(body.fraisInscription),
        fraisScolarite: cleanString(body.fraisScolarite),

        activite: cleanString(body.activite),
        remarque: cleanString(body.remarque),
      },
      select: studentSelect,
    });

    return NextResponse.json(
      { student },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("POST /api/students error:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ce matricule existe déjà" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error?.code === "P2024"
            ? "Base de données occupée. Réessayez."
            : error?.message || "Erreur base de données",
      },
      { status: 500 }
    );
  }
}