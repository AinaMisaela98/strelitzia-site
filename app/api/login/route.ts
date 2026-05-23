import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe obligatoires" },
        { status: 400 }
      );
    }

    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { error: "JWT_SECRET manquant dans Vercel" },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Compte introuvable" },
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

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const res = NextResponse.json({
      success: true,
      role: user.role,
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Erreur serveur login" },
      { status: 500 }
    );
  }
}