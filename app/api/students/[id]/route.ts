import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function cleanString(value: any) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function cleanDate(value: any) {
  if (!value) return null;

  const d = new Date(value);

  if (isNaN(d.getTime())) return null;

  return d;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    const student = await prisma.student.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Étudiant introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur récupération étudiant" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();

    const studentId = Number(id);

    if (!studentId || Number.isNaN(studentId)) {
      return NextResponse.json(
        { error: "ID étudiant invalide" },
        { status: 400 }
      );
    }

    if (!body.matricule || !body.nom || !body.prenoms || !body.sexe) {
      return NextResponse.json(
        { error: "Matricule, nom, prénoms et sexe sont obligatoires" },
        { status: 400 }
      );
    }

    const student = await prisma.student.update({
      where: {
        id: studentId,
      },
      data: {
        photoUrl: cleanString(body.photoUrl),

        matricule: cleanString(body.matricule),
        site: cleanString(body.site) || "Strelitzia School",
        anneeScolaire: cleanString(body.anneeScolaire) || "2025-2026",

        nom: cleanString(body.nom),
        prenoms: cleanString(body.prenoms),
        sexe: body.sexe === "Feminin" ? "Feminin" : "Masculin",
        classe: cleanString(body.classe),
        section: cleanString(body.section),

        contact: cleanString(body.contact || body.telephone),
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

        dateNaissance: cleanDate(body.dateNaissance),
      },
    });

    return NextResponse.json(student);
  } catch (error: any) {
    console.error("PUT STUDENT ERROR:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ce matricule existe déjà" },
        { status: 400 }
      );
    }

    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Étudiant introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Erreur modification étudiant" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const studentId = Number(id);

    if (!studentId || Number.isNaN(studentId)) {
      return NextResponse.json(
        { error: "ID étudiant invalide" },
        { status: 400 }
      );
    }

    await prisma.student.delete({
      where: {
        id: studentId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE STUDENT ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Erreur suppression étudiant" },
      { status: 500 }
    );
  }
}