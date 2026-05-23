const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("12345678", 10);

  await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      name: "Administrateur",
      email: "admin@gmail.com",
      password,
      role: "ADMIN",
    },
  });

  console.log("Admin créé: admin@gmail.com / 12345678");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());