import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();

  if (!auth || auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);

  const { name, email, password, role, active } = await req.json();

  const data: any = {
    name,
    email,
    role,
    active,
  };

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return NextResponse.json(user);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();

  if (!auth || auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);

  if (auth.id === userId) {
    return NextResponse.json(
      { error: "Impossible de supprimer votre propre compte" },
      { status: 400 }
    );
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return NextResponse.json({ success: true });
}