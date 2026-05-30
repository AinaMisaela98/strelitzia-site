import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalize(value: string | null) {
  if (!value || value === "TOUT" || value === "ALL") return undefined;
  return value;
}

function normalizeStatus(status?: string | null) {
  return (status || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function isFeeGreen(status?: string | null, reste?: number | null, paidAt?: Date | string | null) {
  const normalized = normalizeStatus(status);

  return (
    (reste ?? 999999999) <= 0 ||
    Boolean(paidAt) ||
    normalized === "PAYE" ||
    normalized === "PAID" ||
    normalized === "A_IMPRIMER" ||
    normalized === "A_IMPRIME" ||
    normalized === "IMPRIME" ||
    normalized === "IMPRIMEE" ||
    normalized === "PRINTABLE" ||
    normalized.includes("PAYE") ||
    normalized.includes("IMPRIMER") ||
    normalized.includes("IMPRIME")
  );
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

    const schoolYearName = requestedSchoolYearName || activeSchoolYear?.name || undefined;

    const site = normalize(searchParams.get("site"));
    const classe = normalize(searchParams.get("classe"));
    const section =
      normalize(searchParams.get("section")) || normalize(searchParams.get("serie"));

    const frais = normalize(searchParams.get("frais"));
    const etat = normalize(searchParams.get("etat"));
    const matricule = normalize(searchParams.get("matricule"));

    const students = await prisma.student.findMany({
      where: {
        ...(schoolYearName ? { anneeScolaire: schoolYearName } : {}),
        ...(site ? { site } : {}),
        ...(classe ? { classe } : {}),
        ...(section ? { section } : {}),
        ...(matricule
          ? {
              matricule: {
                contains: matricule,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: [{ classe: "asc" }, { section: "asc" }, { matricule: "asc" }],
    });

    const studentIds = students.map((s) => s.id);
    const studentClasses = Array.from(new Set(students.map((s) => s.classe).filter(Boolean)));

    const trainingFees = await prisma.trainingFee.findMany({
      where: {
        ...(schoolYearName ? { schoolYearName } : {}),
        ...(site ? { site } : {}),
        ...(classe ? { classe } : studentClasses.length ? { classe: { in: studentClasses } } : {}),
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

    // Zava-dehibe: rehefa ao amin'ny FRAIS DE FORMATION no "marquer afaka imprimena",
    // mety StudentPayment no voa-update fa tsy StudentFee. Noho izany dia jerena koa StudentPayment.
    const studentPayments = await prisma.studentPayment.findMany({
      where: {
        studentId: { in: studentIds.length ? studentIds : [0] },
        ...(schoolYearName ? { schoolYearName } : {}),
        ...(trainingFeeIds.length ? { trainingFeeId: { in: trainingFeeIds } } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const feeCodes = Array.from(
      new Set(trainingFees.map((f) => f.code).filter(Boolean))
    );

    const rows = students.map((student) => {
      const availableFeesForStudentClass = trainingFees.filter(
        (tf) => tf.classe === student.classe
      );

      const feesForStudent = studentFees.filter((sf) => sf.studentId === student.id);
      const paymentsForStudent = studentPayments.filter((sp) => sp.studentId === student.id);

      const status: Record<string, boolean> = {};

      feeCodes.forEach((code) => {
        const realTrainingFeesForCode = availableFeesForStudentClass.filter(
          (tf) => tf.code === code
        );

        const relatedStudentFees = feesForStudent.filter((sf) =>
          realTrainingFeesForCode.some((tf) => tf.id === sf.trainingFeeId)
        );

        const relatedStudentPayments = paymentsForStudent.filter((sp) =>
          realTrainingFeesForCode.some((tf) => tf.id === sp.trainingFeeId)
        );

        const greenByStudentFee = relatedStudentFees.some((sf) =>
          isFeeGreen(sf.status, sf.reste, sf.paidAt)
        );

        const greenByStudentPayment = relatedStudentPayments.some((sp) =>
          isFeeGreen(sp.status, sp.reste, null)
        );

        status[code] = greenByStudentFee || greenByStudentPayment;
      });

      const montantTotalFromFees = feesForStudent.reduce(
        (sum, f) => sum + (f.montantTotal || 0),
        0
      );

      const montantPayeFromFees = feesForStudent.reduce(
        (sum, f) => sum + (f.montantPaye || 0),
        0
      );

      const resteFromFees = feesForStudent.reduce((sum, f) => sum + (f.reste || 0), 0);

      const montantTotalFromPayments = paymentsForStudent.reduce(
        (sum, p) => sum + (p.montantTotal || 0),
        0
      );

      const montantPayeFromPayments = paymentsForStudent.reduce(
        (sum, p) => sum + (p.montantPaye || 0),
        0
      );

      const resteFromPayments = paymentsForStudent.reduce((sum, p) => sum + (p.reste || 0), 0);

      const montantTotal = montantTotalFromFees || montantTotalFromPayments;
      const montantPaye = montantPayeFromFees || montantPayeFromPayments;
      const reste = feesForStudent.length ? resteFromFees : resteFromPayments;

      let globalStatus = "NON_PAYE";
      if (montantTotal > 0 && reste <= 0) globalStatus = "PAYE";
      else if (montantPaye > 0) globalStatus = "PARTIEL";

      return {
        id: student.id,
        matricule: student.matricule,
        dateInscription: student.dateInscription,
        fullName: `${student.nom ?? ""} ${student.prenoms ?? ""}`.trim(),
        classe: student.classe,
        serie: student.section,
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
        : etat === "PARTIEL"
        ? rows.filter((r) => r.globalStatus === "PARTIEL")
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
        sites: Array.from(new Set(siteStudentsForFilters.map((s) => s.site).filter(Boolean))),
        classes: Array.from(new Set(classStudentsForFilters.map((s) => s.classe).filter(Boolean))),
        series: Array.from(new Set(serieStudentsForFilters.map((s) => s.section).filter(Boolean))),
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
