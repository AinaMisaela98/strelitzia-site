import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalize(value: string | null) {
  if (!value || value === "TOUT" || value === "ALL") return undefined;
  return value.trim();
}

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeStatus(status?: string | null) {
  return normalizeText(status).replace(/[\s-]+/g, "_");
}

/**
 * Etat paiement: volontairement basé sur StudentFee seulement.
 * On ne dépend plus de StudentPayment car la table n'existe pas en production.
 *
 * PAYE marina ihany no atao vert:
 * - status PAYE / PAYÉ / PAID
 * - ou montantPaye >= montantTotal avec montantTotal > 0
 * - ou paidAt existe + montantPaye > 0
 */
function isFeePaid(fee: any) {
  const status = normalizeStatus(fee?.status);

  const montantTotal = Number(fee?.montantTotal || 0);
  const montantPaye = Number(fee?.montantPaye || 0);

  return (
    status === "PAYE" ||
    status === "PAID" ||
    status.includes("PAYE") ||
    (montantTotal > 0 && montantPaye >= montantTotal) ||
    (Boolean(fee?.paidAt) && montantPaye > 0)
  );
}

function uniq<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const activeSchoolYear = await prisma.schoolYear.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });

    const requestedSchoolYearName =
      normalize(searchParams.get("schoolYearName")) ||
      normalize(searchParams.get("anneeScolaire"));

    // Important production:
    // Raha tsy mandefa année scolaire ny page dia tsy manery activeYear,
    // mba tsy ho vide raha activeYear ao Supabase tsy mifanaraka amin'ny données.
    const schoolYearName = requestedSchoolYearName || undefined;

    const site = normalize(searchParams.get("site"));
    const classe = normalize(searchParams.get("classe"));
    const section =
      normalize(searchParams.get("section")) || normalize(searchParams.get("serie"));

    const frais = normalize(searchParams.get("frais"));
    const etat = normalize(searchParams.get("etat"));

    // Ny page taloha mety mandefa "matricule", fa ampiasaina ho recherche générale:
    // matricule, nom, prénoms, nom complet.
    const search =
      normalize(searchParams.get("search")) ||
      normalize(searchParams.get("q")) ||
      normalize(searchParams.get("matricule"));

    const students = await prisma.student.findMany({
      where: {
        ...(schoolYearName ? { anneeScolaire: schoolYearName } : {}),
        ...(site ? { site } : {}),
        ...(classe ? { classe } : {}),
        ...(section ? { section } : {}),
        ...(search
          ? {
              OR: [
                { matricule: { contains: search, mode: "insensitive" } },
                { nom: { contains: search, mode: "insensitive" } },
                { prenoms: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ classe: "asc" }, { section: "asc" }, { matricule: "asc" }],
    });

    const studentIds = students.map((s) => s.id);
    const studentClasses = uniq(students.map((s) => s.classe));

    const trainingFees = await prisma.trainingFee.findMany({
      where: {
        ...(schoolYearName ? { schoolYearName } : {}),
        ...(site ? { site } : {}),
        ...(classe
          ? { classe }
          : studentClasses.length
          ? { classe: { in: studentClasses } }
          : {}),
        ...(frais ? { libelle: frais } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const trainingFeeIds = trainingFees.map((f) => f.id);

    const studentFees = await prisma.studentFee.findMany({
      where: {
        studentId: { in: studentIds.length ? studentIds : [0] },
        ...(schoolYearName ? { schoolYearName } : {}),
        ...(trainingFeeIds.length ? { trainingFeeId: { in: trainingFeeIds } } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const feeCodes = uniq(trainingFees.map((f) => f.code));

    const rows = students.map((student) => {
      const availableFeesForStudentClass = trainingFees.filter(
        (tf) => tf.classe === student.classe
      );

      const feesForStudent = studentFees.filter((sf) => sf.studentId === student.id);

      const status: Record<string, boolean> = {};

      feeCodes.forEach((code) => {
        const realTrainingFeesForCode = availableFeesForStudentClass.filter(
          (tf) => tf.code === code
        );

        const relatedStudentFees = feesForStudent.filter((sf) =>
          realTrainingFeesForCode.some((tf) => tf.id === sf.trainingFeeId)
        );

        // Vert uniquement raha tena voaloa ao amin'ny StudentFee.
        status[code] = relatedStudentFees.some((sf) => isFeePaid(sf));
      });

      const montantTotal = feesForStudent.reduce(
        (sum, f) => sum + Number(f.montantTotal || 0),
        0
      );

      const montantPaye = feesForStudent.reduce(
        (sum, f) => sum + Number(f.montantPaye || 0),
        0
      );

      const reste = feesForStudent.reduce(
        (sum, f) => sum + Number(f.reste || 0),
        0
      );

      let globalStatus = "NON_PAYE";
      if (montantTotal > 0 && montantPaye >= montantTotal) {
        globalStatus = "PAYE";
      }

      return {
        id: student.id,
        matricule: student.matricule,
        dateInscription: student.dateInscription,
        fullName: `${student.nom ?? ""} ${student.prenoms ?? ""}`.trim(),
        nom: student.nom,
        prenoms: student.prenoms,
        classe: student.classe,
        serie: student.section,
        section: student.section,
        site: student.site,
        status,
        paidCount: feeCodes.filter((code) => status[code]).length,
        unpaidCount: feeCodes.filter((code) => !status[code]).length,
        montantTotal,
        montantPaye,
        reste,
        globalStatus,
        fees: feesForStudent.map((fee) => ({
          id: fee.id,
          trainingFeeId: fee.trainingFeeId,
          libelle: fee.libelle,
          code: fee.code,
          montantTotal: fee.montantTotal,
          montantPaye: fee.montantPaye,
          reste: fee.reste,
          status: fee.status,
          paidAt: fee.paidAt,
        })),
      };
    });

    const filteredRows =
      etat === "PAYE"
        ? rows.filter((r) => r.globalStatus === "PAYE")
        : etat === "NON_PAYE"
        ? rows.filter((r) => r.globalStatus === "NON_PAYE")
        : rows;

    const allSchoolYears = await prisma.schoolYear.findMany({
      orderBy: { name: "desc" },
    });

    const siteStudentsForFilters = await prisma.student.findMany({
      where: {
        ...(schoolYearName ? { anneeScolaire: schoolYearName } : {}),
      },
      select: { site: true },
      orderBy: { site: "asc" },
    });

    const classStudentsForFilters = await prisma.student.findMany({
      where: {
        ...(schoolYearName ? { anneeScolaire: schoolYearName } : {}),
        ...(site ? { site } : {}),
      },
      select: { classe: true },
      orderBy: { classe: "asc" },
    });

    const serieStudentsForFilters = await prisma.student.findMany({
      where: {
        ...(schoolYearName ? { anneeScolaire: schoolYearName } : {}),
        ...(site ? { site } : {}),
        ...(classe ? { classe } : {}),
      },
      select: { section: true },
      orderBy: { section: "asc" },
    });

    const filterTrainingFees = await prisma.trainingFee.findMany({
      where: {
        ...(schoolYearName ? { schoolYearName } : {}),
        ...(site ? { site } : {}),
        ...(classe ? { classe } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      activeYear: activeSchoolYear?.name || "",
      feeCodes,
      months: feeCodes,
      rows: filteredRows,
      filters: {
        schoolYears: allSchoolYears.map((y) => y.name),
        sites: uniq(siteStudentsForFilters.map((s) => s.site)),
        classes: uniq(classStudentsForFilters.map((s) => s.classe)),
        series: uniq(serieStudentsForFilters.map((s) => s.section)),
        trainingFees: filterTrainingFees.map((f) => ({
          id: f.id,
          libelle: f.libelle,
          code: f.code,
          classe: f.classe,
          schoolYearName: f.schoolYearName,
        })),
      },
    });
  } catch (error) {
    console.error("FEE_PAYMENT_STATUS_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        feeCodes: [],
        months: [],
        rows: [],
        error: "Erreur serveur fee-payment-status",
      },
      { status: 500 }
    );
  }
}
