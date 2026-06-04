import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const rememberMe = Boolean(body?.rememberMe);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe obligatoires" },
        { status: 400 }
      );
    }

    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { error: "JWT_SECRET manquant dans .env / Vercel Environment Variables" },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roleRef: true,
      },
    });

    if (!user || user.active === false) {
      return NextResponse.json(
        { error: "Compte introuvable ou désactivé" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 }
      );
    }

    const role = String(user.roleRef?.name || user.role || "SECRETAIRE")
      .trim()
      .toUpperCase();

    const roleLabel = String(user.roleRef?.label || role).trim();

    const redirect = role === "ADMIN" ? "/admin" : "/user";

    const maxAge = rememberMe
      ? 60 * 60 * 24 * 30
      : 60 * 60 * 8;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
        roleId: user.roleId,
        roleLabel,
      },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? "30d" : "8h" }
    );

    const res = NextResponse.json({
      success: true,
      role,
      roleLabel,
      redirect,
      rememberMe,
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return res;
  } catch (error: any) {
    console.error("LOGIN_ERROR", error);

    return NextResponse.json(
      { error: error?.message || "Erreur serveur login" },
      { status: 500 }
    );
  }
}