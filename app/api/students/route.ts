import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function cleanString(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cleanDate(value: any) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date;
}

async function getActiveSchoolYearName() {
  let activeYear = await prisma.schoolYear.findFirst({
    where: { active: true },
    select: { name: true },
  });

  if (activeYear) return activeYear.name;

  const created = await prisma.schoolYear.create({
    data: {
      name: "2025-2026",
      active: true,
    },
    select: { name: true },
  });

  return created.name;
}

export async function GET(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const year = cleanString(url.searchParams.get("year"));
    const selectedYear = year || (await getActiveSchoolYearName());

    const students = await prisma.student.findMany({
      where: {
        anneeScolaire: selectedYear,
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: 300,
      select: {
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
        adresse: true,
        signeParticulier: true,
        maladieAllergie: true,
        email: true,

        pereNom: true,
        pereTel: true,
        mereNom: true,
        mereTel: true,
        parentAdresse: true,

        tuteurNom: true,
        tuteurLien: true,
        tuteurTel: true,
        tuteurAdresse: true,

        niveau: true,
        fraisInscription: true,
        fraisScolarite: true,

        activite: true,
        remarque: true,
        createdAt: true,
      },
    });

    return NextResponse.json(students, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur récupération étudiants" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const activeYearName =
      cleanString(body.anneeScolaire) || (await getActiveSchoolYearName());

    const matricule = cleanString(body.matricule);
    const nom = cleanString(body.nom);
    const prenoms = cleanString(body.prenoms);
    const sexe = body.sexe === "Feminin" ? "Feminin" : "Masculin";
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

    const student = await prisma.student.create({
      data: {
        matricule,
        site: cleanString(body.site) || "Strelitzia School",
        anneeScolaire: activeYearName,
        dateInscription: cleanDate(body.dateInscription) || new Date(),

        photoUrl: cleanString(body.photoUrl),

        nom,
        prenoms,
        sexe,
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
    });

    return NextResponse.json(student, {
      status: 201,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ce matricule existe déjà" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Erreur base de données" },
      { status: 500 }
    );
  }
}