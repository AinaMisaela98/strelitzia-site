import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "DIRECTEUR" | "SECRETAIRE";
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
  } catch {
    return null;
  }
}