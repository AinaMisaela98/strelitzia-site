-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SECRETAIRE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matricule" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "anneeScolaire" TEXT NOT NULL,
    "dateInscription" DATETIME NOT NULL,
    "nom" TEXT NOT NULL,
    "prenoms" TEXT NOT NULL,
    "sexe" TEXT NOT NULL,
    "classe" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "contact" TEXT,
    "dateNaissance" DATETIME,
    "lieuNaissance" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_matricule_key" ON "Student"("matricule");
