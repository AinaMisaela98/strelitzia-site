-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matricule" TEXT NOT NULL,
    "site" TEXT NOT NULL DEFAULT 'Strelitzia School',
    "anneeScolaire" TEXT NOT NULL DEFAULT '2025-2026',
    "dateInscription" DATETIME NOT NULL,
    "nom" TEXT NOT NULL,
    "prenoms" TEXT NOT NULL,
    "sexe" TEXT NOT NULL,
    "classe" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "contact" TEXT,
    "dateNaissance" DATETIME,
    "lieuNaissance" TEXT,
    "adresse" TEXT,
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
INSERT INTO "new_Student" ("anneeScolaire", "classe", "contact", "createdAt", "dateInscription", "dateNaissance", "id", "lieuNaissance", "matricule", "nom", "prenoms", "section", "sexe", "site") SELECT "anneeScolaire", "classe", "contact", "createdAt", "dateInscription", "dateNaissance", "id", "lieuNaissance", "matricule", "nom", "prenoms", "section", "sexe", "site" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_matricule_key" ON "Student"("matricule");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
