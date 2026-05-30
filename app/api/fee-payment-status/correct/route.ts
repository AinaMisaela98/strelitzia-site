import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function norm(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getStatus(total: number, paid: number) {
  const safeTotal = Math.max(0, toNumber(total));
  const safePaid = Math.max(0, toNumber(paid));
  const reste = Math.max(0, safeTotal - safePaid);

  if (safeTotal <= 0 || safePaid >= safeTotal || reste <= 0) {
    return { status: "PAYE", reste: 0, paid: Math.max(safePaid, safeTotal) };
  }

  if (safePaid > 0) {
    return { status: "PARTIEL", reste, paid: safePaid };
  }

  return { status: "NON_PAYE", reste: safeTotal, paid: 0 };
}

async function getActiveYear() {
  const year = await prisma.schoolYear.findFirst({
    where: { active: true },
    orderBy: { id: "desc" },
  });

  return year?.name || "2025-2026";
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const activeYear = String(body.schoolYearName || body.year || (await getActiveYear())).trim();
    const site = String(body.site || "").trim();
    const studentId = body.studentId ? Number(body.studentId) : null;

    const students = await prisma.student.findMany({
      where: {
        anneeScolaire: activeYear,
        ...(studentId ? { id: studentId } : {}),
        ...(site ? { site } : {}),
      },
      select: {
        id: true,
        nom: true,
        prenoms: true,
        classe: true,
        section: true,
        site: true,
        anneeScolaire: true,
      },
      orderBy: { id: "asc" },
    });

    const studentIds = students.map((s) => s.id);

    if (studentIds.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Aucun étudiant à corriger pour cette année scolaire.",
        created: 0,
        updated: 0,
        forcedGreen: 0,
        syncedPayments: 0,
      });
    }

    // Schema réel: TrainingFee possède schoolYearName, site, levelId, classe, feeModelId, libelle, code, montant.
    // Il ne possède pas serie/classId/classRoomId.
    const trainingFees = await prisma.trainingFee.findMany({
      where: {
        schoolYearName: activeYear,
        ...(site ? { OR: [{ site }, { site: "" }, { site: "Strelitzia School" }] } : {}),
      },
      orderBy: { id: "asc" },
    });

    const existingFees = await prisma.studentFee.findMany({
      where: {
        schoolYearName: activeYear,
        studentId: { in: studentIds },
      },
      orderBy: { id: "asc" },
    });

    const payments = await prisma.studentPayment.findMany({
      where: {
        schoolYearName: activeYear,
        studentId: { in: studentIds },
      },
      select: {
        id: true,
        studentId: true,
        trainingFeeId: true,
        montantPaye: true,
        status: true,
      },
      orderBy: { id: "asc" },
    });

    const existingByStudentTraining = new Map<string, (typeof existingFees)[number]>();
    const existingByStudentCode = new Map<string, (typeof existingFees)[number][]>();
    const existingByStudentLibelle = new Map<string, (typeof existingFees)[number][]>();

    for (const sf of existingFees) {
      existingByStudentTraining.set(`${sf.studentId}-${sf.trainingFeeId}`, sf);

      const codeKey = `${sf.studentId}-${norm(sf.code)}`;
      if (!existingByStudentCode.has(codeKey)) existingByStudentCode.set(codeKey, []);
      existingByStudentCode.get(codeKey)!.push(sf);

      const libelleKey = `${sf.studentId}-${norm(sf.libelle)}`;
      if (!existingByStudentLibelle.has(libelleKey)) existingByStudentLibelle.set(libelleKey, []);
      existingByStudentLibelle.get(libelleKey)!.push(sf);
    }

    const paymentsByStudentTraining = new Map<string, number>();
    for (const p of payments) {
      const key = `${p.studentId}-${p.trainingFeeId}`;
      paymentsByStudentTraining.set(key, (paymentsByStudentTraining.get(key) || 0) + toNumber(p.montantPaye));
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let forcedGreen = 0;
    let syncedPayments = 0;

    const operations: Promise<unknown>[] = [];

    for (const student of students) {
      const studentClasse = norm(student.classe);

      const feesForStudent = trainingFees.filter((fee) => norm(fee.classe) === studentClasse);

      for (const fee of feesForStudent) {
        const total = toNumber(fee.montant);
        const exactKey = `${student.id}-${fee.id}`;
        const exactExisting = existingByStudentTraining.get(exactKey);

        const sameCode = existingByStudentCode.get(`${student.id}-${norm(fee.code)}`) || [];
        const sameLibelle = existingByStudentLibelle.get(`${student.id}-${norm(fee.libelle)}`) || [];

        const candidatesMap = new Map<number, (typeof existingFees)[number]>();
        if (exactExisting) candidatesMap.set(exactExisting.id, exactExisting);
        for (const item of sameCode) candidatesMap.set(item.id, item);
        for (const item of sameLibelle) candidatesMap.set(item.id, item);
        const candidates = [...candidatesMap.values()];

        const alreadyGreen = candidates.some((item) => item.status === "PAYE" || toNumber(item.reste) <= 0);

        let paidFromOldStudentFees = 0;
        let paidFromPayments = paymentsByStudentTraining.get(exactKey) || 0;
        const oldTrainingFeeIds: number[] = [];

        for (const item of candidates) {
          paidFromOldStudentFees = Math.max(paidFromOldStudentFees, toNumber(item.montantPaye));
          const payKey = `${student.id}-${item.trainingFeeId}`;
          paidFromPayments = Math.max(paidFromPayments, paymentsByStudentTraining.get(payKey) || 0);
          if (item.trainingFeeId !== fee.id) oldTrainingFeeIds.push(item.trainingFeeId);
        }

        // Raha efa PAYE/vert taloha ilay frais, dia arovana: tsy averina mena/mavo intsony.
        const paid = alreadyGreen ? total : Math.max(paidFromOldStudentFees, paidFromPayments);
        const computed = getStatus(total, paid);
        const paidAt = computed.status === "PAYE" ? exactExisting?.paidAt || new Date() : exactExisting?.paidAt || null;

        // Atao mifindra amin'ny trainingFeeId vaovao koa ny StudentPayment taloha raha mitovy code/libelle.
        // Izany no manampy ny état hifanaraka tsara amin'ilay frais vaovao.
        const uniqueOldTrainingFeeIds = [...new Set(oldTrainingFeeIds)].filter((id) => id !== fee.id);
        if (uniqueOldTrainingFeeIds.length > 0 && (alreadyGreen || paidFromPayments > 0 || paidFromOldStudentFees > 0)) {
          operations.push(
            prisma.studentPayment.updateMany({
              where: {
                studentId: student.id,
                schoolYearName: activeYear,
                trainingFeeId: { in: uniqueOldTrainingFeeIds },
              },
              data: {
                trainingFeeId: fee.id,
              },
            })
          );
          syncedPayments += uniqueOldTrainingFeeIds.length;
        }

        if (!exactExisting) {
          operations.push(
            prisma.studentFee.create({
              data: {
                studentId: student.id,
                trainingFeeId: fee.id,
                schoolYearName: activeYear,
                libelle: fee.libelle,
                code: fee.code,
                montantTotal: total,
                montantPaye: computed.paid,
                reste: computed.reste,
                status: computed.status,
                paidAt,
              },
            })
          );
          created++;
          if (computed.status === "PAYE") forcedGreen++;
          continue;
        }

        const changed =
          exactExisting.libelle !== fee.libelle ||
          exactExisting.code !== fee.code ||
          exactExisting.montantTotal !== total ||
          exactExisting.montantPaye !== computed.paid ||
          exactExisting.reste !== computed.reste ||
          exactExisting.status !== computed.status ||
          (computed.status === "PAYE" && !exactExisting.paidAt);

        if (!changed) {
          skipped++;
          continue;
        }

        operations.push(
          prisma.studentFee.update({
            where: { id: exactExisting.id },
            data: {
              libelle: fee.libelle,
              code: fee.code,
              montantTotal: total,
              montantPaye: computed.paid,
              reste: computed.reste,
              status: computed.status,
              paidAt,
            },
          })
        );
        updated++;
        if (computed.status === "PAYE") forcedGreen++;
      }
    }

    // Transaction par petits lots pour éviter timeout.
    const batchSize = 40;
    for (let i = 0; i < operations.length; i += batchSize) {
      await prisma.$transaction(operations.slice(i, i + batchSize) as any);
    }

    return NextResponse.json({
      ok: true,
      message: `Correction terminée : ${created} ajouté(s), ${updated} mis à jour, ${forcedGreen} PAYE remis en vert.`,
      created,
      updated,
      skipped,
      forcedGreen,
      syncedPayments,
      totalStudents: students.length,
      totalTrainingFees: trainingFees.length,
    });
  } catch (error) {
    console.error("FEE_PAYMENT_STATUS_CORRECT_ERROR", error);
    return NextResponse.json(
      { error: "Erreur serveur pendant la correction des frais de scolarité" },
      { status: 500 }
    );
  }
}
