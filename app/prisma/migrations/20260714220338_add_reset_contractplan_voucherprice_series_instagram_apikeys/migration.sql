-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN "seriesId" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "passwordResetExpiresAt" DATETIME;
ALTER TABLE "Employee" ADD COLUMN "passwordResetToken" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "facebookAccessToken" TEXT;
ALTER TABLE "Settings" ADD COLUMN "facebookPageId" TEXT;
ALTER TABLE "Settings" ADD COLUMN "instagramAccessToken" TEXT;
ALTER TABLE "Settings" ADD COLUMN "instagramBusinessAccountId" TEXT;

-- CreateTable
CREATE TABLE "ContractPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "weeklyLimit" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContractDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "autoRenewalMonths" INTEGER NOT NULL,
    "noticePeriodMonths" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "debitOption" TEXT NOT NULL,
    "pausedFrom" DATETIME,
    "pausedTo" DATETIME,
    "cancellationReceivedAt" DATETIME,
    "contractEndDate" DATETIME NOT NULL,
    "cancellationPossibleUntil" DATETIME NOT NULL,
    "cancellationEffectiveAt" DATETIME NOT NULL,
    "autoRenewed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContractDetail_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContractDetail_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContractPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ContractDetail" ("autoRenewalMonths", "autoRenewed", "cancellationEffectiveAt", "cancellationPossibleUntil", "cancellationReceivedAt", "contractEndDate", "customerId", "debitOption", "feeCents", "id", "noticePeriodMonths", "pausedFrom", "pausedTo", "termMonths", "updatedAt") SELECT "autoRenewalMonths", "autoRenewed", "cancellationEffectiveAt", "cancellationPossibleUntil", "cancellationReceivedAt", "contractEndDate", "customerId", "debitOption", "feeCents", "id", "noticePeriodMonths", "pausedFrom", "pausedTo", "termMonths", "updatedAt" FROM "ContractDetail";
DROP TABLE "ContractDetail";
ALTER TABLE "new_ContractDetail" RENAME TO "ContractDetail";
CREATE UNIQUE INDEX "ContractDetail_customerId_key" ON "ContractDetail"("customerId");
CREATE TABLE "new_News" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" DATETIME,
    "status" TEXT NOT NULL,
    "publishOnWebsite" BOOLEAN NOT NULL DEFAULT false,
    "publishOnFacebook" BOOLEAN NOT NULL DEFAULT false,
    "publishOnInstagram" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_News" ("createdAt", "id", "message", "publishOnFacebook", "publishOnWebsite", "sentAt", "status", "subject") SELECT "createdAt", "id", "message", "publishOnFacebook", "publishOnWebsite", "sentAt", "status", "subject" FROM "News";
DROP TABLE "News";
ALTER TABLE "new_News" RENAME TO "News";
CREATE TABLE "new_VoucherType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "validityMonths" INTEGER NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT
);
INSERT INTO "new_VoucherType" ("id", "label", "notes", "sessionCount", "validityMonths") SELECT "id", "label", "notes", "sessionCount", "validityMonths" FROM "VoucherType";
DROP TABLE "VoucherType";
ALTER TABLE "new_VoucherType" RENAME TO "VoucherType";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_passwordResetToken_key" ON "Employee"("passwordResetToken");

