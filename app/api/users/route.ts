import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
const auth = await getAuthUser();

if (!auth || auth.role !== "ADMIN") {
return NextResponse.json(
{ error: "Accès refusé" },
{ status: 403 }
);
}

const users = await prisma.user.findMany({
orderBy: {
id: "desc",
},
include: {
roleRef: true,
},
});

return NextResponse.json(users);
}

export async function POST(req: Request) {
try {
const auth = await getAuthUser();

```
if (!auth || auth.role !== "ADMIN") {
  return NextResponse.json(
    { error: "Accès refusé" },
    { status: 403 }
  );
}

const body = await req.json();

const name = String(body.name || "").trim();
const email = String(body.email || "")
  .trim()
  .toLowerCase();
const password = String(body.password || "");
const roleId = body.roleId
  ? Number(body.roleId)
  : null;

if (!name || !email || !password) {
  return NextResponse.json(
    { error: "Champs incomplets" },
    { status: 400 }
  );
}

const existingUser =
  await prisma.user.findUnique({
    where: {
      email,
    },
  });

if (existingUser) {
  return NextResponse.json(
    {
      error:
        "Cette adresse email existe déjà.",
    },
    { status: 400 }
  );
}

let systemRole:
  | "ADMIN"
  | "DIRECTEUR"
  | "SECRETAIRE" = "SECRETAIRE";

let selectedRole = null;

if (roleId) {
  selectedRole =
    await prisma.userRole.findUnique({
      where: {
        id: roleId,
      },
    });

  if (selectedRole?.name === "ADMIN") {
    systemRole = "ADMIN";
  } else if (
    selectedRole?.name === "DIRECTEUR"
  ) {
    systemRole = "DIRECTEUR";
  }
}

const hashedPassword =
  await bcrypt.hash(password, 10);

const user = await prisma.user.create({
  data: {
    name,
    email,
    password: hashedPassword,

    role: systemRole,

    roleId:
      selectedRole?.id ?? null,

    active: true,
  },
  include: {
    roleRef: true,
  },
});

return NextResponse.json(user);
```

} catch (error: any) {
console.error(
"CREATE_USER_ERROR",
error
);

```
if (error?.code === "P2002") {
  return NextResponse.json(
    {
      error:
        "Cette adresse email existe déjà.",
    },
    { status: 400 }
  );
}

return NextResponse.json(
  {
    error:
      error?.message ||
      "Erreur lors de la création de l'utilisateur",
  },
  { status: 500 }
);
```

}
}
