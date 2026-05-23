import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Compte introuvable" }, { status: 401 });
    }

    const ok = await bcrypt.compare(String(password), user.password);

    if (!ok) {
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
    }

    const role = String(user.role).toUpperCase();
    const redirect = role === "ADMIN" ? "/admin" : "/user";

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    const res = NextResponse.json({
      success: true,
      role,
      redirect,
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur serveur login" },
      { status: 500 }
    );
  }
}