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

function cleanId(value: unknown): number | null {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
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

function buildStudentSelect() {
  const select: any = {
    id: true,
    matricule: true,
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
  };

  if (modelHasField("Student", "siteId")) select.siteId = true;
  if (modelHasField("Student", "site")) select.site = true;

  return select;
}

async function getActiveSchoolYearName(): Promise<string> {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { active: true },
    select: { name: true },
  });

  return activeYear?.name || "2025-2026";
}

async function resolveSchoolYearNameFromUrl(url: URL): Promise<string> {
  const schoolYearName = cleanString(url.searchParams.get("schoolYearName"));
  const anneeScolaire = cleanString(url.searchParams.get("anneeScolaire"));
  const year = cleanString(url.searchParams.get("year"));

  return schoolYearName || anneeScolaire || year || (await getActiveSchoolYearName());
}

async function resolveSchoolYearNameFromBody(body: any): Promise<string> {
  const schoolYearName = cleanString(body?.schoolYearName);
  const anneeScolaire = cleanString(body?.anneeScolaire);
  const year = cleanString(body?.year);

  return schoolYearName || anneeScolaire || year || (await getActiveSchoolYearName());
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
  const siteId = cleanId(body?.siteId);
  const siteName = cleanString(body?.site || body?.siteName);
  const siteCode = cleanString(body?.siteCode);

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

export async function GET(req: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const url = new URL(req.url);

    const selectedYear = await resolveSchoolYearNameFromUrl(url);
    const selectedSite = await resolveSiteFromUrl(url);

    const q = cleanString(url.searchParams.get("q"));
    const classe = cleanString(url.searchParams.get("classe"));
    const section = cleanString(url.searchParams.get("section"));

    const takeParam = Number(url.searchParams.get("take") || 500);
    const take = Number.isFinite(takeParam)
      ? Math.min(Math.max(takeParam, 1), 1000)
      : 500;

    const where: any = {
      anneeScolaire: selectedYear,
    };

    addSiteWhere("Student", where, selectedSite);

    if (classe) where.classe = classe;
    if (section) where.section = section;

    if (q) {
      where.OR = [
        { matricule: { contains: q } },
        { nom: { contains: q } },
        { prenoms: { contains: q } },
        { contact: { contains: q } },
      ];
    }

    const studentSelect = buildStudentSelect();

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select: studentSelect,
        orderBy: { id: "desc" },
        take,
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json(
      {
        students,
        data: students,
        total,
        siteId: selectedSite.id,
        site: selectedSite.name,
        siteCode: selectedSite.code,
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
    console.error("GET /api/students error:", error);

    return NextResponse.json(
      {
        error:
          error?.code === "P2024"
            ? "Base de données occupée. Réessayez dans quelques secondes."
            : error?.code === "P1017"
              ? "Connexion base de données fermée. Vérifiez Supabase."
              : error?.message || "Erreur récupération étudiants",
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

    const selectedYear = await resolveSchoolYearNameFromBody(body);
    const selectedSite = await resolveSiteFromBody(body);

    const duplicateWhere: any = {
      matricule,
      anneeScolaire: selectedYear,
    };

    addSiteWhere("Student", duplicateWhere, selectedSite);

    const duplicate = await prisma.student.findFirst({
      where: duplicateWhere,
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "Ce matricule existe déjà pour cette année scolaire et ce site.",
        },
        { status: 400 }
      );
    }

    const data: any = {
      matricule,
      anneeScolaire: selectedYear,
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
    };

    addSiteData("Student", data, selectedSite);

    const student = await prisma.student.create({
      data,
      select: buildStudentSelect(),
    });

    return NextResponse.json(
      {
        student,
        data: student,
        siteId: selectedSite.id,
        site: selectedSite.name,
        siteCode: selectedSite.code,
        schoolYearName: selectedYear,
        anneeScolaire: selectedYear,
      },
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
        {
          error:
            "Ce matricule existe déjà pour cette année scolaire et ce site.",
        },
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
