import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getActiveYear() {
  let year = await prisma.schoolYear.findFirst({
    where: { active: true },
  });

  if (!year) {
    year = await prisma.schoolYear.create({
      data: { name: "2025-2026", active: true },
    });
  }

  return year.name;
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

function amountToNumber(value: any) {
  if (typeof value === "number") return value;
  return Number(String(value || "").replace(/\s/g, "").replace(/,/g, "")) || 0;
}

function modelFieldMetas(modelName: string) {
  const runtimeModel = (prisma as any)?._runtimeDataModel?.models?.[modelName];
  return runtimeModel?.fields || [];
}

function modelFieldNames(modelName: string) {
  return modelFieldMetas(modelName).map((f: any) => f.name) as string[];
}

function modelFieldType(modelName: string, fieldName: string) {
  const field = modelFieldMetas(modelName).find((f: any) => f.name === fieldName);
  return String(field?.type || field?.kind || "");
}

function has(fields: string[], field: string) {
  return fields.includes(field);
}

function pickFirst(fields: string[], names: string[]) {
  return names.find((name) => has(fields, name));
}

function apiError(error: any) {
  return {
    error: "Erreur serveur",
    code: error?.code || null,
    message: error?.message || "Erreur inconnue",
    meta: error?.meta || null,
  };
}

function normalizeText(value: any) {
  return String(value || "").trim();
}

function normalizeUpper(value: any) {
  return normalizeText(value).toUpperCase();
}

async function resolveSiteFromUrl(url: URL) {
  const rawSiteId = Number(url.searchParams.get("siteId") || 0);
  const siteName = normalizeText(url.searchParams.get("site"));
  const siteCode = normalizeText(url.searchParams.get("siteCode"));

  if (rawSiteId) {
    const site = await prisma.site.findUnique({
      where: { id: rawSiteId },
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

async function resolveSiteFromBody(body: any) {
  const rawSiteId = Number(body?.siteId || 0);
  const siteName = normalizeText(body?.site || body?.siteName);
  const siteCode = normalizeText(body?.siteCode);

  if (rawSiteId) {
    const site = await prisma.site.findUnique({
      where: { id: rawSiteId },
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

function normalizeSpecialTarifs(value: any) {
  if (!value) return {};

  let source = value;

  if (typeof value === "string") {
    try {
      source = JSON.parse(value);
    } catch {
      return {};
    }
  }

  if (typeof source !== "object" || Array.isArray(source)) return {};

  const result: Record<string, number> = {};

  for (const [key, rawAmount] of Object.entries(source)) {
    const name = normalizeText(key);
    const amount = amountToNumber(rawAmount);

    if (name && amount >= 0) {
      result[name] = amount;
    }
  }

  return result;
}

function specialTarifsField(fields: string[]) {
  return pickFirst(fields, [
    "specials",
    "tarifs",
    "specialTarifs",
    "tarifsSpeciaux",
    "montantsSpeciaux",
    "specialAmounts",
    "customTarifs",
  ]);
}

function valueForPrismaField(modelName: string, fieldName: string, value: any) {
  const fieldType = modelFieldType(modelName, fieldName).toLowerCase();

  if (fieldType.includes("json")) return value;
  if (fieldType.includes("string")) return JSON.stringify(value || {});

  return value;
}

async function resolveClassNameFromRequest(url: URL) {
  const directClasse =
    url.searchParams.get("classe") ||
    url.searchParams.get("className") ||
    url.searchParams.get("classRoomName") ||
    "";

  if (directClasse) return directClasse.trim();

  const studentId = Number(url.searchParams.get("studentId") || 0);
  if (studentId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classe: true },
    });

    if (student?.classe) return student.classe;
  }

  const classRoomId = Number(
    url.searchParams.get("classRoomId") ||
      url.searchParams.get("classId") ||
      url.searchParams.get("classeId") ||
      0
  );

  if (classRoomId) {
    const classe = await prisma.classRoom.findUnique({
      where: { id: classRoomId },
      select: { name: true },
    });

    if (classe?.name) return classe.name;
  }

  return "";
}

async function resolveClassRoomIdFromRequest(url: URL, classeName?: string, siteId?: number) {
  const directId = Number(
    url.searchParams.get("classRoomId") ||
      url.searchParams.get("classId") ||
      url.searchParams.get("classeId") ||
      0
  );

  if (directId) return directId;

  if (classeName) {
    const year =
      url.searchParams.get("schoolYearName") ||
      url.searchParams.get("year") ||
      url.searchParams.get("anneeScolaire") ||
      "";

    const classe = await prisma.classRoom.findFirst({
      where: {
        name: classeName,
        ...(year ? { schoolYearName: year } : {}),
        ...(siteId ? { siteId } : {}),
      } as any,
      select: { id: true },
    });

    if (classe?.id) return classe.id;
  }

  return 0;
}

function buildTrainingFeeData(fields: string[], input: any, row: any) {
  const data: any = {};

  const schoolYearField = pickFirst(fields, [
    "schoolYearName",
    "year",
    "anneeScolaire",
    "academicYear",
  ]);
  const siteIdField = pickFirst(fields, ["siteId"]);
  const siteField = pickFirst(fields, ["site", "schoolSite"]);
  const levelIdField = pickFirst(fields, ["levelId", "niveauId"]);
  const levelNameField = pickFirst(fields, ["level", "niveau"]);

  const classIdField = pickFirst(fields, ["classRoomId", "classId", "classeId"]);
  const classNameField = pickFirst(fields, ["classe", "className", "classRoomName"]);

  const modelField = pickFirst(fields, ["feeModelId", "modelId", "modeleFraisId"]);
  const modelNameField = pickFirst(fields, [
    "feeModelTitle",
    "modelTitle",
    "typeModele",
    "modele",
  ]);

  const libelleField = pickFirst(fields, ["libelle", "intitule", "title", "name"]);
  const codeField = pickFirst(fields, ["code"]);
  const montantField = pickFirst(fields, ["montant", "amount", "tarif"]);

  if (schoolYearField) data[schoolYearField] = input.schoolYearName;
  if (siteIdField) data[siteIdField] = input.siteId;
  if (siteField) data[siteField] = input.site;
  if (levelIdField) data[levelIdField] = input.levelId;
  if (levelNameField) data[levelNameField] = input.levelName;

  if (classIdField) data[classIdField] = input.classRoomId;
  if (classNameField) data[classNameField] = input.className;

  if (modelField) data[modelField] = input.feeModelId;
  if (modelNameField) data[modelNameField] = input.feeModelTitle;

  if (libelleField) data[libelleField] = row.libelle;
  if (codeField) data[codeField] = row.code;
  if (montantField) data[montantField] = row.montant;

  const specialsField = specialTarifsField(fields);
  if (specialsField) {
    data[specialsField] = valueForPrismaField(
      "TrainingFee",
      specialsField,
      normalizeSpecialTarifs(row.specials || row.tarifs || row.tarifsSpeciaux)
    );
  }

  return data;
}

/**
 * GET /api/training-fees
 *
 * Filtre fiable par site + année + classe.
 * Accepte:
 * - siteId / site / siteCode
 * - schoolYearName / year / anneeScolaire
 * - classRoomId / classId / classeId
 * - classe / className / classRoomName
 * - studentId: maka classe automatique avy amin'ilay étudiant
 */
export async function GET(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const fields = modelFieldNames("TrainingFee");
    const selectedSite = await resolveSiteFromUrl(url);

    const schoolYearField = pickFirst(fields, [
      "schoolYearName",
      "year",
      "anneeScolaire",
      "academicYear",
    ]);
    const classIdField = pickFirst(fields, ["classRoomId", "classId", "classeId"]);
    const classNameField = pickFirst(fields, ["classe", "className", "classRoomName"]);
    const siteIdField = pickFirst(fields, ["siteId"]);
    const siteField = pickFirst(fields, ["site", "schoolSite"]);

    const year =
      url.searchParams.get("schoolYearName") ||
      url.searchParams.get("year") ||
      url.searchParams.get("anneeScolaire") ||
      (await getActiveYear());

    const classeName = await resolveClassNameFromRequest(url);
    const classRoomId = await resolveClassRoomIdFromRequest(url, classeName, selectedSite.id);

    const where: any = {};

    if (schoolYearField && year) {
      where[schoolYearField] = year;
    }

    if (siteIdField) {
      where[siteIdField] = selectedSite.id;
    } else if (siteField) {
      where[siteField] = selectedSite.name;
    }

    if (classIdField && classRoomId) {
      where[classIdField] = classRoomId;
    } else if (classNameField && classeName) {
      where[classNameField] = classeName;
    }

    const data = await prisma.trainingFee.findMany({
      where,
      orderBy: has(fields, "id") ? { id: "asc" } : undefined,
    });

    const filtered =
      classNameField && classeName
        ? data.filter((item: any) => normalizeUpper(item[classNameField]) === normalizeUpper(classeName))
        : data;

    return NextResponse.json({
      data: filtered,
      trainingFees: filtered,
      siteId: selectedSite.id,
      site: selectedSite.name,
      siteCode: selectedSite.code,
      schoolYearName: year,
      anneeScolaire: year,
    });
  } catch (error: any) {
    console.error("GET /api/training-fees", error);
    return NextResponse.json(apiError(error), { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const fields = modelFieldNames("TrainingFee");
    const selectedSite = await resolveSiteFromBody(body);

    if (!fields.length) {
      return NextResponse.json(
        {
          error: "Model Prisma TrainingFee introuvable. Lancez npx prisma generate.",
        },
        { status: 500 }
      );
    }

    const classRoomId = Number(
      body.classRoomId || body.classId || body.classeId || 0
    );
    const levelId = Number(body.levelId || body.niveauId || 0);
    const feeModelId = Number(
      body.feeModelId || body.modelId || body.modeleFraisId || 0
    );

    if (!classRoomId || !levelId || !feeModelId) {
      return NextResponse.json(
        {
          error: "Données incomplètes",
          details: { classRoomId, levelId, feeModelId },
        },
        { status: 400 }
      );
    }

    const classe = await prisma.classRoom.findUnique({
      where: { id: classRoomId },
      include: { level: true },
    });

    if (!classe) {
      return NextResponse.json(
        { error: "Classe introuvable", classRoomId },
        { status: 400 }
      );
    }

    if (Number((classe as any).levelId) !== levelId) {
      return NextResponse.json(
        {
          error: "Cette classe n'appartient pas au niveau sélectionné",
          classRoomId,
          selectedLevelId: levelId,
          realLevelId: (classe as any).levelId,
        },
        { status: 400 }
      );
    }

    if ((classe as any).siteId && Number((classe as any).siteId) !== selectedSite.id) {
      return NextResponse.json(
        {
          error: "Cette classe n'appartient pas au site sélectionné",
          classRoomId,
          selectedSiteId: selectedSite.id,
          realSiteId: (classe as any).siteId,
        },
        { status: 400 }
      );
    }

    let feeModelTitle = body.feeModelTitle || "";

    if ((prisma as any).feeModel?.findUnique) {
      const feeModel = await prisma.feeModel.findUnique({
        where: { id: feeModelId },
      });

      if (!feeModel) {
        return NextResponse.json(
          { error: "Modèle de frais introuvable", feeModelId },
          { status: 400 }
        );
      }

      if ((feeModel as any).siteId && Number((feeModel as any).siteId) !== selectedSite.id) {
        return NextResponse.json(
          {
            error: "Ce modèle de frais n'appartient pas au site sélectionné",
            feeModelId,
            selectedSiteId: selectedSite.id,
            realSiteId: (feeModel as any).siteId,
          },
          { status: 400 }
        );
      }

      feeModelTitle =
        (feeModel as any).title || (feeModel as any).name || feeModelTitle;
    }

    const input = {
      schoolYearName:
        body.schoolYearName ||
        body.year ||
        body.anneeScolaire ||
        (classe as any).schoolYearName ||
        (await getActiveYear()),
      siteId: selectedSite.id,
      site: selectedSite.name,
      levelId,
      levelName: (classe as any).level?.name || body.levelName || "",
      classRoomId,
      className: (classe as any).name,
      feeModelId,
      feeModelTitle,
    };

    const rowsSource = Array.isArray(body.rows)
      ? body.rows
      : [
          {
            libelle: body.libelle || body.intitule || body.title || body.name,
            code: body.code,
            montant: body.montant || body.amount,
            specials: body.specials || body.tarifs || body.tarifsSpeciaux,
          },
        ];

    const rows = rowsSource
      .map((row: any) => ({
        libelle: String(
          row.libelle || row.intitule || row.title || row.name || ""
        ).trim(),
        code: String(row.code || "").trim(),
        montant: amountToNumber(row.montant || row.amount || row.tarif),
        specials: normalizeSpecialTarifs(row.specials || row.tarifs || row.tarifsSpeciaux),
      }))
      .filter((row: any) => row.libelle && row.code && row.montant > 0);

    if (!input.schoolYearName || rows.length === 0) {
      return NextResponse.json(
        {
          error: "Données incomplètes",
          details: { ...input, rows: rows.length },
        },
        { status: 400 }
      );
    }

    const classIdField = pickFirst(fields, [
      "classRoomId",
      "classId",
      "classeId",
    ]);
    const classNameField = pickFirst(fields, [
      "classe",
      "className",
      "classRoomName",
    ]);
    const modelField = pickFirst(fields, [
      "feeModelId",
      "modelId",
      "modeleFraisId",
    ]);
    const schoolYearField = pickFirst(fields, [
      "schoolYearName",
      "year",
      "anneeScolaire",
      "academicYear",
    ]);
    const siteIdField = pickFirst(fields, ["siteId"]);
    const siteField = pickFirst(fields, ["site", "schoolSite"]);

    if (!classIdField && !classNameField) {
      return NextResponse.json(
        {
          error: "Champ classe manquant dans TrainingFee",
          solution:
            "Ajoutez classRoomId Int ou classe String dans model TrainingFee.",
          fields,
        },
        { status: 500 }
      );
    }

    const deleteWhere: any = {};

    if (classIdField) {
      deleteWhere[classIdField] = input.classRoomId;
    } else if (classNameField) {
      deleteWhere[classNameField] = input.className;
    }

    if (modelField) {
      deleteWhere[modelField] = input.feeModelId;
    }

    if (schoolYearField) {
      deleteWhere[schoolYearField] = input.schoolYearName;
    }

    if (siteIdField) {
      deleteWhere[siteIdField] = input.siteId;
    } else if (siteField) {
      deleteWhere[siteField] = input.site;
    }

    /**
     * Recréation propre UNIQUEMENT amin'ilay:
     * même site + même année + même classe + même modèle.
     * Tsy mikitika site hafa na Grade hafa.
     */
    await prisma.trainingFee.deleteMany({
      where: deleteWhere,
    });

    const created = await prisma.$transaction(
      rows.map((row: any) => {
        const data = buildTrainingFeeData(fields, input, row);
        return prisma.trainingFee.create({ data });
      })
    );

    return NextResponse.json({
      success: true,
      count: created.length,
      data: created,
      trainingFees: created,
      siteId: selectedSite.id,
      site: selectedSite.name,
      siteCode: selectedSite.code,
      schoolYearName: input.schoolYearName,
      anneeScolaire: input.schoolYearName,
    });
  } catch (error: any) {
    console.error("POST /api/training-fees", error);
    return NextResponse.json(apiError(error), { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body.id);
    const fields = modelFieldNames("TrainingFee");
    const selectedSite = await resolveSiteFromBody(body);

    if (!id) {
      return NextResponse.json({ error: "ID frais manquant" }, { status: 400 });
    }

    const libelleField = pickFirst(fields, ["libelle", "intitule", "title", "name"]);
    const codeField = pickFirst(fields, ["code"]);
    const montantField = pickFirst(fields, ["montant", "amount", "tarif"]);
    const specialsField = specialTarifsField(fields);
    const siteIdField = pickFirst(fields, ["siteId"]);
    const siteField = pickFirst(fields, ["site", "schoolSite"]);

    const data: any = {};

    if (libelleField && body.libelle !== undefined) {
      data[libelleField] = String(body.libelle || "").trim();
    }

    if (codeField && body.code !== undefined) {
      data[codeField] = String(body.code || "").trim();
    }

    if (montantField && body.montant !== undefined) {
      data[montantField] = amountToNumber(body.montant);
    }

    if (siteIdField && body.siteId !== undefined) {
      data[siteIdField] = selectedSite.id;
    }

    if (siteField && (body.site !== undefined || body.siteName !== undefined || body.siteId !== undefined)) {
      data[siteField] = selectedSite.name;
    }

    if (
      specialsField &&
      (body.specials !== undefined ||
        body.tarifs !== undefined ||
        body.tarifsSpeciaux !== undefined)
    ) {
      data[specialsField] = valueForPrismaField(
        "TrainingFee",
        specialsField,
        normalizeSpecialTarifs(body.specials || body.tarifs || body.tarifsSpeciaux)
      );
    }

    if (!Object.keys(data).length) {
      return NextResponse.json(
        { error: "Aucun champ modifiable trouvé dans TrainingFee", fields },
        { status: 400 }
      );
    }

    const updated = await prisma.trainingFee.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/training-fees", error);
    return NextResponse.json(apiError(error), { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const fields = modelFieldNames("TrainingFee");
    const selectedSite = await resolveSiteFromUrl(url);

    const id = Number(url.searchParams.get("id") || 0);

    if (id) {
      const deleted = await prisma.trainingFee.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        deletedBy: "id",
        data: deleted,
      });
    }

    const schoolYearField = pickFirst(fields, [
      "schoolYearName",
      "year",
      "anneeScolaire",
      "academicYear",
    ]);
    const classIdField = pickFirst(fields, [
      "classRoomId",
      "classId",
      "classeId",
    ]);
    const classNameField = pickFirst(fields, [
      "classe",
      "className",
      "classRoomName",
    ]);
    const modelField = pickFirst(fields, [
      "feeModelId",
      "modelId",
      "modeleFraisId",
    ]);
    const siteIdField = pickFirst(fields, ["siteId"]);
    const siteField = pickFirst(fields, ["site", "schoolSite"]);

    const schoolYearName =
      url.searchParams.get("schoolYearName") ||
      url.searchParams.get("year") ||
      url.searchParams.get("anneeScolaire") ||
      (await getActiveYear());

    const classeName = await resolveClassNameFromRequest(url);
    const classRoomId = await resolveClassRoomIdFromRequest(url, classeName, selectedSite.id);
    const feeModelId = Number(
      url.searchParams.get("feeModelId") ||
        url.searchParams.get("modelId") ||
        url.searchParams.get("modeleFraisId") ||
        0
    );

    if (!classRoomId && !classeName) {
      return NextResponse.json(
        { error: "ID frais ou classe manquant" },
        { status: 400 }
      );
    }

    const where: any = {};

    if (classIdField && classRoomId) {
      where[classIdField] = classRoomId;
    } else if (classNameField && classeName) {
      where[classNameField] = classeName;
    } else {
      return NextResponse.json(
        { error: "Champ classe introuvable dans TrainingFee", fields },
        { status: 400 }
      );
    }

    if (schoolYearField) {
      where[schoolYearField] = schoolYearName;
    }

    if (modelField && feeModelId) {
      where[modelField] = feeModelId;
    }

    if (siteIdField) {
      where[siteIdField] = selectedSite.id;
    } else if (siteField) {
      where[siteField] = selectedSite.name;
    }

    const deleted = await prisma.trainingFee.deleteMany({ where });

    return NextResponse.json({
      success: true,
      deletedBy: "class",
      count: deleted.count,
      siteId: selectedSite.id,
      site: selectedSite.name,
      schoolYearName,
    });
  } catch (error: any) {
    console.error("DELETE /api/training-fees", error);
    return NextResponse.json(apiError(error), { status: 500 });
  }
}
