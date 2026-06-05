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

async function getDefaultSite() {
  let site = await prisma.site.findFirst({
    where: { active: true },
    orderBy: { id: "asc" },
  });

  if (!site) {
    site = await prisma.site.create({
      data: {
        name: "Strelitzia School",
        code: "STRELITZIA",
        active: true,
      },
    });
  }

  return site;
}

async function requireUser() {
  const user = await getAuthUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Non autorisé" }, { status: 401 }),
    };
  }

  return { user, response: null };
}

function cleanName(value: unknown) {
  return String(value || "").trim();
}

function cleanId(value: unknown) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function resolveSiteId(value: unknown) {
  const id = cleanId(value);

  if (id) return id;

  const site = await getDefaultSite();
  return site.id;
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const url = new URL(req.url);
  const year = url.searchParams.get("year") || (await getActiveYear());
  const siteId = await resolveSiteId(url.searchParams.get("siteId"));

  const levels = await prisma.level.findMany({
    where: {
      schoolYearName: year,
      siteId,
    },
    include: {
      classes: {
        where: {
          schoolYearName: year,
          siteId,
        },
        include: {
          series: {
            where: {
              schoolYearName: year,
              siteId,
            },
            orderBy: { id: "asc" },
          },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ year, siteId, levels });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();

    const type = body.type;
    const name = cleanName(body.name);
    const year = cleanName(body.schoolYearName) || (await getActiveYear());
    const siteId = await resolveSiteId(body.siteId);

    if (!name || !type) {
      return NextResponse.json({ error: "Champs incomplets" }, { status: 400 });
    }

    if (type === "level") {
      const item = await prisma.level.create({
        data: {
          name,
          schoolYearName: year,
          siteId,
        },
      });

      return NextResponse.json(item);
    }

    if (type === "class") {
      const levelId = cleanId(body.levelId);

      if (!levelId) {
        return NextResponse.json({ error: "Niveau obligatoire" }, { status: 400 });
      }

      const level = await prisma.level.findUnique({
        where: { id: levelId },
      });

      if (!level) {
        return NextResponse.json({ error: "Niveau introuvable" }, { status: 404 });
      }

      const item = await prisma.classRoom.create({
        data: {
          name,
          levelId,
          schoolYearName: level.schoolYearName || year,
          siteId: level.siteId || siteId,
        },
      });

      return NextResponse.json(item);
    }

    if (type === "serie") {
      const classRoomId = cleanId(body.classRoomId);

      if (!classRoomId) {
        return NextResponse.json({ error: "Classe obligatoire" }, { status: 400 });
      }

      const classRoom = await prisma.classRoom.findUnique({
        where: { id: classRoomId },
      });

      if (!classRoom) {
        return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
      }

      const names: string[] = Array.isArray(body.names)
        ? body.names
            .map((item: unknown) => cleanName(item))
            .filter((item: string) => item.length > 0)
        : name
            .split(/[,;\n]/)
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 0);

      if (names.length > 1) {
        const items = await prisma.$transaction(
          names.map((serieName: string) =>
            prisma.serie.create({
              data: {
                name: serieName,
                classRoomId,
                schoolYearName: classRoom.schoolYearName || year,
                siteId: classRoom.siteId || siteId,
              },
            })
          )
        );

        return NextResponse.json({ count: items.length, items });
      }

      const item = await prisma.serie.create({
        data: {
          name: names[0] || name,
          classRoomId,
          schoolYearName: classRoom.schoolYearName || year,
          siteId: classRoom.siteId || siteId,
        },
      });

      return NextResponse.json(item);
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  } catch (error: any) {
    console.error("ACADEMICS_POST_ERROR", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Existe déjà pour cette année scolaire et ce site" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();

    const type = body.type;
    const id = cleanId(body.id);
    const name = cleanName(body.name);
    const siteId = await resolveSiteId(body.siteId);

    if (!type || !id || !name) {
      return NextResponse.json({ error: "Champs incomplets" }, { status: 400 });
    }

    if (type === "level") {
      const item = await prisma.level.update({
        where: { id },
        data: {
          name,
          siteId,
        },
      });

      return NextResponse.json(item);
    }

    if (type === "class") {
      const data: {
        name: string;
        levelId?: number;
        schoolYearName?: string;
        siteId?: number;
      } = { name };

      const levelId = cleanId(body.levelId);

      if (levelId) {
        const level = await prisma.level.findUnique({
          where: { id: levelId },
        });

        if (!level) {
          return NextResponse.json({ error: "Niveau introuvable" }, { status: 404 });
        }

        data.levelId = levelId;
        data.schoolYearName = level.schoolYearName;
        data.siteId = level.siteId || siteId;
      } else {
        data.siteId = siteId;
      }

      const item = await prisma.classRoom.update({
        where: { id },
        data,
      });

      return NextResponse.json(item);
    }

    if (type === "serie") {
      const data: {
        name: string;
        classRoomId?: number;
        schoolYearName?: string;
        siteId?: number;
      } = { name };

      const classRoomId = cleanId(body.classRoomId);

      if (classRoomId) {
        const classRoom = await prisma.classRoom.findUnique({
          where: { id: classRoomId },
        });

        if (!classRoom) {
          return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
        }

        data.classRoomId = classRoomId;
        data.schoolYearName = classRoom.schoolYearName;
        data.siteId = classRoom.siteId || siteId;
      } else {
        data.siteId = siteId;
      }

      const item = await prisma.serie.update({
        where: { id },
        data,
      });

      return NextResponse.json(item);
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  } catch (error: any) {
    console.error("ACADEMICS_PUT_ERROR", error);

    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Élément introuvable" }, { status: 404 });
    }

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Existe déjà pour cette année scolaire et ce site" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();

    const type = body.type;
    const id = cleanId(body.id);

    if (!type || !id) {
      return NextResponse.json({ error: "Champs incomplets" }, { status: 400 });
    }

    if (type === "serie") {
      await prisma.serie.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (type === "class") {
      await prisma.$transaction([
        prisma.serie.deleteMany({ where: { classRoomId: id } }),
        prisma.classRoom.delete({ where: { id } }),
      ]);

      return NextResponse.json({ success: true });
    }

    if (type === "level") {
      const classes = await prisma.classRoom.findMany({
        where: { levelId: id },
        select: { id: true },
      });

      const classIds: number[] = classes.map((item: { id: number }) => item.id);

      await prisma.$transaction([
        prisma.serie.deleteMany({
          where: {
            classRoomId: {
              in: classIds.length ? classIds : [-1],
            },
          },
        }),
        prisma.classRoom.deleteMany({ where: { levelId: id } }),
        prisma.level.delete({ where: { id } }),
      ]);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  } catch (error: any) {
    console.error("ACADEMICS_DELETE_ERROR", error);

    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Élément introuvable" }, { status: 404 });
    }

    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: "Suppression impossible: élément déjà utilisé ailleurs" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}