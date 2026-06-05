import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toNumber(value: any) {
  return Number(String(value || "").replace(/\s/g, "")) || 0;
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

async function getActiveYear() {
  const year = await prisma.schoolYear.findFirst({
    where: { active: true },
  });

  return year?.name || "2025-2026";
}

async function getDefaultSite() {
  let site = await prisma.site.findFirst({
    where: { active: true },
    orderBy: { id: "asc" },
    select: { id: true, name: true, code: true },
  });

  if (!site) {
    site = await prisma.site.create({
      data: {
        name: "Strelitzia School",
        code: "STRELITZIA",
        active: true,
      },
      select: { id: true, name: true, code: true },
    });
  }

  return site;
}

async function resolveSiteFromBody(body: any) {
  const siteId = Number(body?.siteId || 0);
  const siteName = cleanText(body?.site || body?.siteName);
  const siteCode = cleanText(body?.siteCode);

  if (siteId) {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, name: true, code: true },
    });

    if (site) return site;
  }

  if (siteCode) {
    const site = await prisma.site.findUnique({
      where: { code: siteCode },
      select: { id: true, name: true, code: true },
    });

    if (site) return site;
  }

  if (siteName) {
    const site = await prisma.site.findFirst({
      where: { name: siteName },
      select: { id: true, name: true, code: true },
    });

    if (site) return site;
  }

  return getDefaultSite();
}

async function resolveSiteFromUrl(url: URL) {
  return resolveSiteFromBody({
    siteId: url.searchParams.get("siteId"),
    site: url.searchParams.get("site"),
    siteName: url.searchParams.get("siteName"),
    siteCode: url.searchParams.get("siteCode"),
  });
}

function modelFieldMetas(modelName: string) {
  const runtimeModel = (prisma as any)?._runtimeDataModel?.models?.[modelName];
  return runtimeModel?.fields || [];
}

function modelFieldNames(modelName: string) {
  return modelFieldMetas(modelName).map((field: any) => field.name) as string[];
}

function modelHasField(modelName: string, fieldName: string) {
  return modelFieldNames(modelName).includes(fieldName);
}

function addSiteWhere(modelName: string, where: any, site: any) {
  if (!site) return where;

  if (modelHasField(modelName, "siteId")) {
    where.siteId = Number(site.id);
  } else if (modelHasField(modelName, "site")) {
    where.site = String(site.name || "");
  }

  return where;
}

function addSiteData(modelName: string, data: any, site: any) {
  if (!site) return data;

  if (modelHasField(modelName, "siteId")) {
    data.siteId = Number(site.id);
  }

  if (modelHasField(modelName, "site")) {
    data.site = String(site.name || "");
  }

  return data;
}

export async function GET(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);

    const studentId = Number(url.searchParams.get("studentId"));
    const trainingFeeId = Number(url.searchParams.get("trainingFeeId") || 0);
    const schoolYearName =
      cleanText(
        url.searchParams.get("schoolYearName") ||
          url.searchParams.get("anneeScolaire") ||
          url.searchParams.get("year")
      ) || (await getActiveYear());

    const site = await resolveSiteFromUrl(url);

    if (!studentId) {
      return NextResponse.json({ error: "Étudiant manquant" }, { status: 400 });
    }

    const where: any = {
      studentId,
      schoolYearName,
    };

    if (trainingFeeId) {
      where.trainingFeeId = trainingFeeId;
    }

    addSiteWhere("StudentPayment", where, site);

    const payments = await prisma.studentPayment.findMany({
      where,
      orderBy: { id: "desc" },
    });

    return NextResponse.json({
      data: payments,
      payments,
      studentPayments: payments,
      siteId: site.id,
      site: site.name,
      siteCode: site.code,
      schoolYearName,
      anneeScolaire: schoolYearName,
    });
  } catch (error: any) {
    console.error("GET /api/student-payments:", error);

    return NextResponse.json(
      { error: "Erreur serveur", message: error?.message || String(error) },
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

    const studentId = Number(body.studentId);
    const trainingFeeId = Number(body.trainingFeeId);
    const montantTotal = toNumber(body.montantTotal);
    const montantPayeInput = toNumber(body.montantPaye);
    const schoolYearName =
      cleanText(body.schoolYearName || body.anneeScolaire || body.year) ||
      (await getActiveYear());

    const site = await resolveSiteFromBody(body);

    if (!studentId || !trainingFeeId || !montantTotal || !montantPayeInput) {
      return NextResponse.json(
        { error: "Données paiement incomplètes" },
        { status: 400 }
      );
    }

    const studentWhere: any = {
      id: studentId,
      anneeScolaire: schoolYearName,
    };

    addSiteWhere("Student", studentWhere, site);

    const student = await prisma.student.findFirst({
      where: studentWhere,
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Étudiant introuvable pour cette année scolaire et ce site" },
        { status: 404 }
      );
    }

    const trainingFeeWhere: any = {
      id: trainingFeeId,
      schoolYearName,
    };

    addSiteWhere("TrainingFee", trainingFeeWhere, site);

    const trainingFee = await prisma.trainingFee.findFirst({
      where: trainingFeeWhere,
      select: { id: true },
    });

    if (!trainingFee) {
      return NextResponse.json(
        { error: "Frais de formation introuvable pour cette année scolaire et ce site" },
        { status: 404 }
      );
    }

    const existingWhere: any = {
      studentId,
      trainingFeeId,
      schoolYearName,
    };

    addSiteWhere("StudentPayment", existingWhere, site);

    const existing = await prisma.studentPayment.findFirst({
      where: existingWhere,
    });

    const dejaPaye = existing?.montantPaye || 0;
    const nouveauTotalPaye = dejaPaye + montantPayeInput;

    if (nouveauTotalPaye > montantTotal) {
      return NextResponse.json(
        { error: "Le montant payé dépasse le montant total" },
        { status: 400 }
      );
    }

    const reste = montantTotal - nouveauTotalPaye;
    const status = reste <= 0 ? "PAYE" : "PARTIEL";

    if (existing) {
      const data: any = {
        montantPaye: nouveauTotalPaye,
        reste,
        status,
      };

      addSiteData("StudentPayment", data, site);

      const updated = await prisma.studentPayment.update({
        where: { id: existing.id },
        data,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        siteId: site.id,
        site: site.name,
        schoolYearName,
      });
    }

    const data: any = {
      studentId,
      trainingFeeId,
      schoolYearName,
      montantTotal,
      montantPaye: montantPayeInput,
      reste,
      status,
    };

    addSiteData("StudentPayment", data, site);

    const created = await prisma.studentPayment.create({
      data,
    });

    return NextResponse.json({
      success: true,
      data: created,
      siteId: site.id,
      site: site.name,
      schoolYearName,
    });
  } catch (error: any) {
    console.error("POST /api/student-payments:", error);

    return NextResponse.json(
      { error: "Erreur serveur", message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
