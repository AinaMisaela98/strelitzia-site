-- CreateTable
CREATE TABLE "StudentFee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "trainingFeeId" INTEGER NOT NULL,
    "schoolYearName" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "montantTotal" INTEGER NOT NULL,
    "montantPaye" INTEGER NOT NULL DEFAULT 0,
    "reste" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NON_PAYE',
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentFee_studentId_trainingFeeId_schoolYearName_key" ON "StudentFee"("studentId", "trainingFeeId", "schoolYearName");
