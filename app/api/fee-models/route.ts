import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanId(value: unknown) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function requireUser() {
  const user = await getAuthUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ message: "Non autorisé" }, { status: 401 }),
    };
  }

  return { user, response: null };
}

async function getActiveSchoolYearName() {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { active: true },
    orderBy: { id: "desc" },
    select: { name: true },
  });

  if (activeYear?.name) return activeYear.name;

  const firstYear = await prisma.schoolYear.findFirst({
    orderBy: { id: "desc" },
    select: { name: true },
  });

  if (firstYear?.name) return firstYear.name;

  const created = await prisma.schoolYear.create({
    data: {
      name: "2025-2026",
      active: true,
    },
    select: { name: true },
  });

  return created.name;
}

async function getActiveSite() {
  const activeSite = await prisma.site.findFirst({
    where: { active: true },
    orderBy: { id: "asc" },
    select: { id: true, name: true, code: true },
  });

  if (activeSite) return activeSite;

  const firstSite = await prisma.site.findFirst({
    orderBy: { id: "asc" },
    select: { id: true, name: true, code: true },
  });

  if (firstSite) return firstSite;

  return await prisma.site.create({
    data: {
      name: "Strelitzia School",
      code: "STRELITZIA",
      active: true,
    },
    select: { id: true, name: true, code: true },
  });
}

async function resolveSite(value: unknown) {
  const id = cleanId(value);

  if (id) {
    const site = await prisma.site.findUnique({
      where: { id },
      select: { id: true, name: true, code: true },
    });

    if (site) return site;
  }

  return await getActiveSite();
}

async function resolveSchoolYearNameFromUrl(url: URL) {
  const schoolYearName = clean(url.searchParams.get("schoolYearName"));
  const anneeScolaire = clean(url.searchParams.get("anneeScolaire"));
  const year = clean(url.searchParams.get("year"));

  return schoolYearName || anneeScolaire || year || (await getActiveSchoolYearName());
}

async function resolveSchoolYearNameFromBody(body: any) {
  const schoolYearName = clean(body?.schoolYearName);
  const anneeScolaire = clean(body?.anneeScolaire);
  const year = clean(body?.year);

  return schoolYearName || anneeScolaire || year || (await getActiveSchoolYearName());
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const url = new URL(req.url);

    const q = clean(url.searchParams.get("q"));
    const selectedYear = await resolveSchoolYearNameFromUrl(url);
    const selectedSite = await resolveSite(url.searchParams.get("siteId"));
    const classe = clean(url.searchParams.get("classe"));

    const where: any = {
      schoolYearName: selectedYear,
      siteId: selectedSite.id,
    };

    if (classe && classe !== "TOUT") {
      where.classe = classe;
    }

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { schoolYearName: { contains: q } },
        { classe: { contains: q } },
      ];
    }

    const models = await prisma.feeModel.findMany({
      where,
      include: {
        tariffs: {
          include: {
            specials: {
              orderBy: { id: "asc" },
            },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: [{ id: "desc" }],
    });

    const modelsWithSite = models.map((model: any) => ({
      ...model,
      site: selectedSite,
      siteRef: selectedSite,
    }));

    return NextResponse.json(
      {
        models: modelsWithSite,
        site: selectedSite,
        siteId: selectedSite.id,
        schoolYearName: selectedYear,
        anneeScolaire: selectedYear,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/fee-models:", error);

    return NextResponse.json(
      {
        message: error?.message || "Erreur chargement modèles de frais.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();

    const title = clean(body?.title);
    const schoolYearName = await resolveSchoolYearNameFromBody(body);
    const selectedSite = await resolveSite(body?.siteId);
    const classe = clean(body?.classe) || "GENERAL";

    if (!title || !schoolYearName) {
      return NextResponse.json(
        { message: "Titre et année scolaire obligatoires." },
        { status: 400 }
      );
    }

    const exists = await prisma.feeModel.findFirst({
      where: {
        title,
        schoolYearName,
        siteId: selectedSite.id,
        classe,
      },
      select: { id: true },
    });

    if (exists) {
      return NextResponse.json(
        {
          message:
            "Ce modèle existe déjà pour cette année scolaire, ce site et cette classe.",
        },
        { status: 409 }
      );
    }

    const model = await prisma.feeModel.create({
      data: {
        title,
        schoolYearName,
        siteId: selectedSite.id,
        classe,
      },
      include: {
        tariffs: {
          include: {
            specials: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ...model,
        site: selectedSite,
        siteRef: selectedSite,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("POST /api/fee-models:", error);

    return NextResponse.json(
      {
        message: error?.message || "Erreur création modèle de frais.",
      },
      { status: 500 }
    );
  }
}