-- CreateTable
CREATE TABLE "SchoolYear" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
CREATE TABLE "Permission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matricule" TEXT NOT NULL,
    "site" TEXT NOT NULL DEFAULT 'Strelitzia School',
    "anneeScolaire" TEXT NOT NULL DEFAULT '2025-2026',
    "dateInscription" DATETIME NOT NULL,
    "photoUrl" TEXT,
    "nom" TEXT NOT NULL,
    "prenoms" TEXT NOT NULL,
    "sexe" TEXT NOT NULL,
    "classe" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "contact" TEXT,
    "dateNaissance" DATETIME,
    "lieuNaissance" TEXT,
    "adresse" TEXT,
    "signeParticulier" TEXT,
    "maladieAllergie" TEXT,
    "email" TEXT,
    "pereNom" TEXT,
    "pereTel" TEXT,
    "mereNom" TEXT,
    "mereTel" TEXT,
    "parentAdresse" TEXT,
    "tuteurNom" TEXT,
    "tuteurLien" TEXT,
    "tuteurTel" TEXT,
    "tuteurAdresse" TEXT,
    "niveau" TEXT,
    "fraisInscription" TEXT,
    "fraisScolarite" TEXT,
    "activite" TEXT,
    "remarque" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Level" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "schoolYearName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ClassRoom" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "schoolYearName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassRoom_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Serie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "classRoomId" INTEGER NOT NULL,
    "schoolYearName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Serie_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeeModel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "classe" TEXT NOT NULL,
    "schoolYearName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FeeTariff" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feeModelId" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeeTariff_feeModelId_fkey" FOREIGN KEY ("feeModelId") REFERENCES "FeeModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeeSpecialTariff" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feeTariffId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeeSpecialTariff_feeTariffId_fkey" FOREIGN KEY ("feeTariffId") REFERENCES "FeeTariff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingFee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "schoolYearName" TEXT NOT NULL,
    "site" TEXT NOT NULL DEFAULT 'Strelitzia School',
    "levelId" INTEGER,
    "classe" TEXT NOT NULL,
    "feeModelId" INTEGER,
    "libelle" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StudentPayment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "trainingFeeId" INTEGER NOT NULL,
    "schoolYearName" TEXT NOT NULL,
    "montantTotal" INTEGER NOT NULL,
    "montantPaye" INTEGER NOT NULL,
    "reste" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PARTIEL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolYear_name_key" ON "SchoolYear"("name");

-- CreateIndex
CREATE INDEX "SchoolYear_active_idx" ON "SchoolYear"("active");

-- CreateIndex
CREATE INDEX "SchoolYear_name_idx" ON "SchoolYear"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Permission_role_idx" ON "Permission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_role_action_key" ON "Permission"("role", "action");

-- CreateIndex
CREATE INDEX "Student_anneeScolaire_idx" ON "Student"("anneeScolaire");

-- CreateIndex
CREATE INDEX "Student_classe_idx" ON "Student"("classe");

-- CreateIndex
CREATE INDEX "Student_section_idx" ON "Student"("section");

-- CreateIndex
CREATE INDEX "Student_anneeScolaire_classe_section_idx" ON "Student"("anneeScolaire", "classe", "section");

-- CreateIndex
CREATE INDEX "Student_createdAt_idx" ON "Student"("createdAt");

-- CreateIndex
CREATE INDEX "Student_nom_idx" ON "Student"("nom");

-- CreateIndex
CREATE INDEX "Student_matricule_idx" ON "Student"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "Student_matricule_anneeScolaire_key" ON "Student"("matricule", "anneeScolaire");

-- CreateIndex
CREATE INDEX "Level_schoolYearName_idx" ON "Level"("schoolYearName");

-- CreateIndex
CREATE INDEX "Level_name_idx" ON "Level"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Level_name_schoolYearName_key" ON "Level"("name", "schoolYearName");

-- CreateIndex
CREATE INDEX "ClassRoom_levelId_idx" ON "ClassRoom"("levelId");

-- CreateIndex
CREATE INDEX "ClassRoom_schoolYearName_idx" ON "ClassRoom"("schoolYearName");

-- CreateIndex
CREATE INDEX "ClassRoom_name_idx" ON "ClassRoom"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ClassRoom_name_levelId_schoolYearName_key" ON "ClassRoom"("name", "levelId", "schoolYearName");

-- CreateIndex
CREATE INDEX "Serie_classRoomId_idx" ON "Serie"("classRoomId");

-- CreateIndex
CREATE INDEX "Serie_schoolYearName_idx" ON "Serie"("schoolYearName");

-- CreateIndex
CREATE INDEX "Serie_name_idx" ON "Serie"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Serie_name_classRoomId_schoolYearName_key" ON "Serie"("name", "classRoomId", "schoolYearName");

-- CreateIndex
CREATE INDEX "FeeModel_schoolYearName_idx" ON "FeeModel"("schoolYearName");

-- CreateIndex
CREATE INDEX "FeeModel_classe_idx" ON "FeeModel"("classe");

-- CreateIndex
CREATE UNIQUE INDEX "FeeModel_title_classe_schoolYearName_key" ON "FeeModel"("title", "classe", "schoolYearName");

-- CreateIndex
CREATE INDEX "FeeTariff_feeModelId_idx" ON "FeeTariff"("feeModelId");

-- CreateIndex
CREATE INDEX "FeeTariff_code_idx" ON "FeeTariff"("code");

-- CreateIndex
CREATE INDEX "FeeSpecialTariff_feeTariffId_idx" ON "FeeSpecialTariff"("feeTariffId");

-- CreateIndex
CREATE INDEX "FeeSpecialTariff_name_idx" ON "FeeSpecialTariff"("name");

-- CreateIndex
CREATE INDEX "TrainingFee_schoolYearName_idx" ON "TrainingFee"("schoolYearName");

-- CreateIndex
CREATE INDEX "TrainingFee_classe_idx" ON "TrainingFee"("classe");

-- CreateIndex
CREATE INDEX "TrainingFee_code_idx" ON "TrainingFee"("code");

-- CreateIndex
CREATE INDEX "TrainingFee_feeModelId_idx" ON "TrainingFee"("feeModelId");
