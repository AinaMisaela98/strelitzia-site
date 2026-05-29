import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

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

function amountToNumber(value: any) {
  if (typeof value === "number") return value;
  return Number(String(value || "").replace(/\s/g, "").replace(/,/g, "")) || 0;
}

function modelFieldNames(modelName: string) {
  const runtimeModel = (prisma as any)?._runtimeDataModel?.models?.[modelName];
  const fields = runtimeModel?.fields || [];
  return fields.map((f: any) => f.name) as string[];
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

function buildTrainingFeeData(fields: string[], input: any, row: any) {
  const data: any = {};

  const schoolYearField = pickFirst(fields, [
    "schoolYearName",
    "year",
    "anneeScolaire",
    "academicYear",
  ]);
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

  return data;
}

export async function GET(req: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const fields = modelFieldNames("TrainingFee");

    const schoolYearField = pickFirst(fields, [
      "schoolYearName",
      "year",
      "anneeScolaire",
      "academicYear",
    ]);
    const classIdField = pickFirst(fields, ["classRoomId", "classId", "classeId"]);
    const classNameField = pickFirst(fields, ["classe", "className", "classRoomName"]);

    const year =
      url.searchParams.get("schoolYearName") ||
      url.searchParams.get("year") ||
      "";

    const classRoomId = Number(
      url.searchParams.get("classRoomId") ||
        url.searchParams.get("classId") ||
        0
    );

    const where: any = {};

    if (schoolYearField && year) {
      where[schoolYearField] = year;
    }

    if (classIdField && classRoomId) {
      where[classIdField] = classRoomId;
    } else if (classNameField && classRoomId) {
      const classe = await prisma.classRoom.findUnique({
        where: { id: classRoomId },
      });

      if (classe) {
        where[classNameField] = classe.name;
      }
    }

    const data = await prisma.trainingFee.findMany({
      where,
      orderBy: has(fields, "id") ? { id: "desc" } : undefined,
    });

    return NextResponse.json(data);
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

      feeModelTitle =
        (feeModel as any).title || (feeModel as any).name || feeModelTitle;
    }

    const input = {
      schoolYearName:
        body.schoolYearName ||
        body.year ||
        (classe as any).schoolYearName ||
        (await getActiveYear()),
      site: body.site || "Strelitzia School",
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
          },
        ];

    const rows = rowsSource
      .map((row: any) => ({
        libelle: String(
          row.libelle || row.intitule || row.title || row.name || ""
        ).trim(),
        code: String(row.code || "").trim(),
        montant: amountToNumber(row.montant || row.amount || row.tarif),
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

    // Recréation propre du même modèle dans la même classe.
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

    if (!id) {
      return NextResponse.json({ error: "ID frais manquant" }, { status: 400 });
    }

    const fields = modelFieldNames("TrainingFee");

    const libelleField = pickFirst(fields, ["libelle", "intitule", "title", "name"]);
    const codeField = pickFirst(fields, ["code"]);
    const montantField = pickFirst(fields, ["montant", "amount", "tarif"]);

    const data: any = {};

    if (libelleField) data[libelleField] = String(body.libelle || "").trim();
    if (codeField) data[codeField] = String(body.code || "").trim();
    if (montantField) data[montantField] = amountToNumber(body.montant);

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

    const schoolYearName =
      url.searchParams.get("schoolYearName") ||
      url.searchParams.get("year") ||
      (await getActiveYear());

    const classRoomId = Number(
      url.searchParams.get("classRoomId") ||
        url.searchParams.get("classId") ||
        0
    );

    const classeNameFromUrl = url.searchParams.get("classe") || "";

    if (!classRoomId && !classeNameFromUrl) {
      return NextResponse.json(
        { error: "ID frais ou classe manquant" },
        { status: 400 }
      );
    }

    const where: any = {};

    if (classIdField && classRoomId) {
      where[classIdField] = classRoomId;
    } else if (classNameField) {
      if (classeNameFromUrl) {
        where[classNameField] = classeNameFromUrl;
      } else {
        const classe = await prisma.classRoom.findUnique({
          where: { id: classRoomId },
        });

        if (!classe) {
          return NextResponse.json(
            { error: "Classe introuvable", classRoomId },
            { status: 400 }
          );
        }

        where[classNameField] = classe.name;
      }
    } else {
      return NextResponse.json(
        { error: "Champ classe introuvable dans TrainingFee", fields },
        { status: 400 }
      );
    }

    if (schoolYearField) {
      where[schoolYearField] = schoolYearName;
    }

    const deleted = await prisma.trainingFee.deleteMany({ where });

    return NextResponse.json({
      success: true,
      deletedBy: "class",
      count: deleted.count,
    });
  } catch (error: any) {
    console.error("DELETE /api/training-fees", error);
    return NextResponse.json(apiError(error), { status: 500 });
  }
}
