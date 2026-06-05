import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function makeCode(name: string) {
  return name
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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

async function ensureDefaultSite() {
  let site = await prisma.site.findFirst({
    where: { active: true },
    orderBy: { id: "asc" },
  });

  if (site) return site;

  site = await prisma.site.findFirst({
    orderBy: { id: "asc" },
  });

  if (site) {
    return await prisma.site.update({
      where: { id: site.id },
      data: { active: true },
    });
  }

  return await prisma.site.create({
    data: {
      name: "Strelitzia School",
      code: "STRELITZIA",
      active: true,
    },
  });
}

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    await ensureDefaultSite();

    const sites = await prisma.site.findMany({
      orderBy: [{ active: "desc" }, { id: "asc" }],
    });

    return NextResponse.json(
      { sites },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/sites:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erreur chargement sites.",
        sites: [],
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

    const name = cleanText(body?.name);
    const code = cleanText(body?.code) || makeCode(name);

    if (!name) {
      return NextResponse.json({ error: "Nom du site obligatoire" }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ error: "Code du site obligatoire" }, { status: 400 });
    }

    const existing = await prisma.site.findFirst({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ce code site existe déjà" },
        { status: 400 }
      );
    }

    const site = await prisma.site.create({
      data: {
        name,
        code,
        active: body?.active !== false,
      },
    });

    return NextResponse.json({ site }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/sites:", error);

    return NextResponse.json(
      { error: error?.message || "Erreur création site." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();

    const id = Number(body?.id);
    const name = cleanText(body?.name);
    const code = cleanText(body?.code) || makeCode(name);

    if (!id) {
      return NextResponse.json({ error: "ID obligatoire" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Nom du site obligatoire" }, { status: 400 });
    }

    const site = await prisma.site.update({
      where: { id },
      data: {
        name,
        code,
        active: body?.active !== false,
      },
    });

    return NextResponse.json({ site });
  } catch (error: any) {
    console.error("PUT /api/sites:", error);

    return NextResponse.json(
      { error: error?.message || "Erreur modification site." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const id = Number(new URL(req.url).searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "ID obligatoire" }, { status: 400 });
    }

    await prisma.site.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/sites:", error);

    return NextResponse.json(
      { error: error?.message || "Erreur suppression site." },
      { status: 500 }
    );
  }
}