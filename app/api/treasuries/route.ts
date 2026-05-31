import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function text(v: unknown) {
  return String(v ?? "").trim();
}

function getSchoolYearFromUrl(req: Request) {
  const url = new URL(req.url);
  return (
    text(url.searchParams.get("schoolYearName")) ||
    text(url.searchParams.get("anneeScolaire")) ||
    text(url.searchParams.get("year")) ||
    "2025-2026"
  );
}

function getSchoolYearFromBody(body: any) {
  return (
    text(body?.schoolYearName) ||
    text(body?.anneeScolaire) ||
    text(body?.year) ||
    "2025-2026"
  );
}

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const schoolYearName = getSchoolYearFromUrl(req);

    const treasuries = await prisma.treasury.findMany({
      where: { schoolYearName },
      orderBy: [{ active: "desc" }, { isPrincipal: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ treasuries, schoolYearName });
  } catch (error: any) {
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
    const name = text(body.name);
    const type = text(body.type || "CAISSE").toUpperCase();
    const schoolYearName = getSchoolYearFromBody(body);
    const active = body.active !== false;
    const isPrincipal = body.isPrincipal === true;

    if (!name) {
      return NextResponse.json({ error: "Nom obligatoire" }, { status: 400 });
    }

    if (!schoolYearName) {
      return NextResponse.json({ error: "Année scolaire obligatoire" }, { status: 400 });
    }

    const existing = await prisma.treasury.findFirst({
      where: {
        name,
        schoolYearName,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `La trésorerie "${name}" existe déjà pour ${schoolYearName}` },
        { status: 409 }
      );
    }

    if (isPrincipal) {
      await prisma.treasury.updateMany({
        where: { schoolYearName },
        data: { isPrincipal: false },
      });
    }

    const treasury = await prisma.treasury.create({
      data: {
        name,
        type,
        active,
        isPrincipal,
        schoolYearName,
      },
    });

    return NextResponse.json({ treasury, schoolYearName }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur serveur", message: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body.id);
    const name = text(body.name);
    const type = text(body.type || "CAISSE").toUpperCase();
    const schoolYearName = getSchoolYearFromBody(body);
    const active = body.active !== false;
    const isPrincipal = body.isPrincipal === true;

    if (!id) {
      return NextResponse.json({ error: "ID obligatoire" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Nom obligatoire" }, { status: 400 });
    }

    const current = await prisma.treasury.findFirst({
      where: {
        id,
        schoolYearName,
      },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Trésorerie introuvable pour cette année scolaire" },
        { status: 404 }
      );
    }

    const duplicate = await prisma.treasury.findFirst({
      where: {
        name,
        schoolYearName,
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `La trésorerie "${name}" existe déjà pour ${schoolYearName}` },
        { status: 409 }
      );
    }

    if (isPrincipal) {
      await prisma.treasury.updateMany({
        where: {
          schoolYearName,
          NOT: { id },
        },
        data: { isPrincipal: false },
      });
    }

    const treasury = await prisma.treasury.update({
      where: { id },
      data: {
        name,
        type,
        active,
        isPrincipal,
        schoolYearName,
      },
    });

    return NextResponse.json({ treasury, schoolYearName });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur serveur", message: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    const schoolYearName = getSchoolYearFromUrl(req);

    if (!id) {
      return NextResponse.json({ error: "ID obligatoire" }, { status: 400 });
    }

    const treasury = await prisma.treasury.findFirst({
      where: {
        id,
        schoolYearName,
      },
    });

    if (!treasury) {
      return NextResponse.json(
        { error: "Trésorerie introuvable pour cette année scolaire" },
        { status: 404 }
      );
    }

    const movements = await prisma.treasuryMovement.count({
      where: {
        treasuryId: id,
        schoolYearName,
      },
    });

    if (movements > 0) {
      await prisma.treasury.update({
        where: { id },
        data: { active: false },
      });

      return NextResponse.json({ ok: true, archived: true, schoolYearName });
    }

    await prisma.treasury.delete({ where: { id } });

    return NextResponse.json({ ok: true, deleted: true, schoolYearName });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur serveur", message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
