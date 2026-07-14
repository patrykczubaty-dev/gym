-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TrialProposedSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trialId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "courseId" TEXT,
    "token" TEXT NOT NULL,
    "response" TEXT NOT NULL DEFAULT 'PENDING',
    "respondedAt" DATETIME,
    CONSTRAINT "TrialProposedSlot_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrialProposedSlot_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrialProposedSlot" ("courseId", "id", "respondedAt", "response", "startsAt", "token", "trialId") SELECT "courseId", "id", "respondedAt", "response", "startsAt", "token", "trialId" FROM "TrialProposedSlot";
DROP TABLE "TrialProposedSlot";
ALTER TABLE "new_TrialProposedSlot" RENAME TO "TrialProposedSlot";
CREATE UNIQUE INDEX "TrialProposedSlot_token_key" ON "TrialProposedSlot"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
