import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthUser();

  if (!auth || auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { id: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const auth = await getAuthUser();

  if (!auth || auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const {
  name,
  email,
  password,
  role,
  roleId,
} = await req.json();

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Champs incomplets" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
try {
  const user = await prisma.user.create({
    data: {
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      roleId: roleId || null,
      active: true,
    },
  });

  return NextResponse.json(user);
} catch (error: any) {
  if (error?.code === "P2002") {
    return NextResponse.json(
      {
        error: "Cette adresse email existe déjà.",
      },
      { status: 400 }
    );
  }

  console.error("CREATE_USER_ERROR", error);

  return NextResponse.json(
    {
      error: "Erreur lors de la création de l'utilisateur",
    },
    { status: 500 }
  );
}
}