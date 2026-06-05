import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import StudentDetails from "@/components/StudentDetails";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cleanId(value: unknown): number | null {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function getActiveSchoolYearName(): Promise<string> {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { active: true },
    select: { name: true },
  });

  return activeYear?.name || "2025-2026";
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

async function resolveSiteFromSearchParams(searchParams?: {
  siteId?: string;
  site?: string;
  siteName?: string;
  siteCode?: string;
}) {
  const siteId = cleanId(searchParams?.siteId);
  const siteName = cleanString(searchParams?.site || searchParams?.siteName);
  const siteCode = cleanString(searchParams?.siteCode);

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

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    schoolYearName?: string;
    anneeScolaire?: string;
    year?: string;
    siteId?: string;
    site?: string;
    siteName?: string;
    siteCode?: string;
  }>;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/");

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const studentId = Number(id);

  if (!Number.isFinite(studentId) || studentId <= 0) {
    redirect("/user");
  }

  const selectedYear =
    cleanString(resolvedSearchParams.schoolYearName) ||
    cleanString(resolvedSearchParams.anneeScolaire) ||
    cleanString(resolvedSearchParams.year) ||
    (await getActiveSchoolYearName());

  const selectedSite = await resolveSiteFromSearchParams(resolvedSearchParams);

  const where: any = {
    id: studentId,
    anneeScolaire: selectedYear,
  };

  addSiteWhere("Student", where, selectedSite);

  let student = await prisma.student.findFirst({
    where,
  });

  /*
    Sécurité:
    Raha avy amin'ny ancien lien tsy mbola mandefa siteId/year ilay page,
    dia tsy atao tapaka tampoka ny accès. Mitady ilay étudiant amin'ny id izy,
    fa ny affichage sy API manaraka dia mbola afaka mandefa siteId + année.
  */
  if (!student) {
    student = await prisma.student.findUnique({
      where: {
        id: studentId,
      },
    });
  }

  if (!student) {
    redirect("/user");
  }

  return (
    <StudentDetails
      user={user as any}
      student={student as any}
      schoolYearName={selectedYear}
      anneeScolaire={selectedYear}
      siteId={selectedSite.id}
      site={selectedSite.name}
      siteCode={selectedSite.code}
    />
  );
}
