import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function clean(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const studentId = Number(body?.studentId);
    const data = body?.data;

    if (!studentId || Number.isNaN(studentId)) {
      return NextResponse.json(
        { message: "Étudiant invalide." },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { message: "Données de réinscription manquantes." },
        { status: 400 }
      );
    }

    const matricule = clean(data.matricule);
    const nom = clean(data.nom);
    const prenoms = clean(data.prenoms);
    const sexe = clean(data.sexe);
    const anneeScolaire = clean(data.anneeScolaire);
    const classe = clean(data.classe);
    const section = clean(data.section);

    if (!matricule || !nom || !prenoms || !sexe) {
      return NextResponse.json(
        { message: "Matricule, nom, prénoms et sexe obligatoires." },
        { status: 400 }
      );
    }

    if (!anneeScolaire || !classe || !section) {
      return NextResponse.json(
        { message: "Année scolaire, classe et série obligatoires." },
        { status: 400 }
      );
    }

    const oldStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!oldStudent) {
      return NextResponse.json(
        { message: "Étudiant introuvable." },
        { status: 404 }
      );
    }

    if (oldStudent.anneeScolaire === anneeScolaire) {
      return NextResponse.json(
        { message: "Choisissez une année scolaire différente de l’ancienne." },
        { status: 400 }
      );
    }

    const alreadyExists = await prisma.student.findFirst({
      where: {
        matricule,
        anneeScolaire,
      },
    });

    if (alreadyExists) {
      return NextResponse.json(
        { message: "Cet étudiant est déjà réinscrit pour cette année scolaire." },
        { status: 409 }
      );
    }

    const newStudent = await prisma.student.create({
      data: {
        matricule,
        site: oldStudent.site || "Strelitzia School",
        anneeScolaire,
        dateInscription: new Date(),

        photoUrl: oldStudent.photoUrl || null,

        nom,
        prenoms,
        sexe: sexe as "Masculin" | "Feminin",
        classe,
        section,

        contact: clean(data.contact),
        dateNaissance: clean(data.dateNaissance)
          ? new Date(String(data.dateNaissance))
          : null,
        lieuNaissance: clean(data.lieuNaissance),
        adresse: clean(data.adresse),
        signeParticulier: clean(data.signeParticulier),
        maladieAllergie: clean(data.maladieAllergie),
        email: clean(data.email),

        pereNom: clean(data.pereNom),
        pereTel: clean(data.pereTel),
        mereNom: clean(data.mereNom),
        mereTel: clean(data.mereTel),
        parentAdresse: clean(data.parentAdresse),

        tuteurNom: clean(data.tuteurNom),
        tuteurLien: clean(data.tuteurLien),
        tuteurTel: clean(data.tuteurTel),
        tuteurAdresse: clean(data.tuteurAdresse),

        niveau: clean(data.niveau),
        fraisInscription: clean(data.fraisInscription),
        fraisScolarite: clean(data.fraisScolarite),

        activite: clean(data.activite),
        remarque: clean(data.remarque),
      },
    });

    return NextResponse.json({
      message: "Réinscription réussie.",
      student: newStudent,
    });
  } catch (error) {
    console.error("Erreur API /api/students/reinscription:", error);

    return NextResponse.json(
      { message: "Erreur lors de la réinscription. Vérifiez les champs et la base de données." },
      { status: 500 }
    );
  }
}