-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "city" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birthday" DATETIME NOT NULL,
    "employeeSince" DATETIME NOT NULL,
    "locationId" TEXT NOT NULL,
    "street" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "mobile" TEXT,
    "notes" TEXT,
    "photoUrl" TEXT,
    "passwordHash" TEXT NOT NULL,
    "canLogin" BOOLEAN NOT NULL DEFAULT true,
    "bankName" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "salaryCents" INTEGER,
    "paymentSchedule" TEXT,
    "permAdmin" BOOLEAN NOT NULL DEFAULT false,
    "permCalendar" BOOLEAN NOT NULL DEFAULT false,
    "permTrials" BOOLEAN NOT NULL DEFAULT false,
    "permVouchers" BOOLEAN NOT NULL DEFAULT false,
    "permEmployees" BOOLEAN NOT NULL DEFAULT false,
    "permCustomers" BOOLEAN NOT NULL DEFAULT false,
    "permSepa" BOOLEAN NOT NULL DEFAULT false,
    "permEmailTemplates" BOOLEAN NOT NULL DEFAULT false,
    "permNews" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeePayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "EmployeePayout_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birthday" DATETIME NOT NULL,
    "street" TEXT,
    "houseNumber" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "notes" TEXT,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL,
    "originTrialId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Customer_originTrialId_fkey" FOREIGN KEY ("originTrialId") REFERENCES "Trial" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerBankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "bankName" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "directDebitAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "mandatePdfUrl" TEXT,
    CONSTRAINT "CustomerBankAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SepaDebit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "bookingDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "SepaDebit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContractDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
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
    CONSTRAINT "ContractDetail_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoucherType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "validityMonths" INTEGER NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "VoucherAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "voucherTypeId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "remainingSessions" INTEGER NOT NULL,
    CONSTRAINT "VoucherAssignment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VoucherAssignment_voucherTypeId_fkey" FOREIGN KEY ("voucherTypeId") REFERENCES "VoucherType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "leadTrainerId" TEXT NOT NULL,
    "participantLimit" INTEGER NOT NULL,
    "trialPossible" BOOLEAN NOT NULL DEFAULT false,
    "trialDate" DATETIME,
    CONSTRAINT "Course_leadTrainerId_fkey" FOREIGN KEY ("leadTrainerId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "capacity" INTEGER NOT NULL,
    CONSTRAINT "CalendarEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calendarEventId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "waitlistPosition" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "locationId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trial_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrialProposedSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trialId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "courseId" TEXT,
    "token" TEXT NOT NULL,
    "response" TEXT NOT NULL DEFAULT 'PENDING',
    "respondedAt" DATETIME,
    CONSTRAINT "TrialProposedSlot_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" DATETIME,
    "status" TEXT NOT NULL,
    "publishOnWebsite" BOOLEAN NOT NULL DEFAULT false,
    "publishOnFacebook" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NewsAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "newsId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    CONSTRAINT "NewsAttachment_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "defaultNoticePeriodMonths" INTEGER NOT NULL DEFAULT 3,
    "defaultAutoRenewalMonths" INTEGER NOT NULL DEFAULT 3
);

-- CreateTable
CREATE TABLE "_NewsLocations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_NewsLocations_A_fkey" FOREIGN KEY ("A") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_NewsLocations_B_fkey" FOREIGN KEY ("B") REFERENCES "News" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CourseLocations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CourseLocations_A_fkey" FOREIGN KEY ("A") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CourseLocations_B_fkey" FOREIGN KEY ("B") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerBankAccount_customerId_key" ON "CustomerBankAccount"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractDetail_customerId_key" ON "ContractDetail"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherAssignment_customerId_key" ON "VoucherAssignment"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrialProposedSlot_token_key" ON "TrialProposedSlot"("token");

-- CreateIndex
CREATE UNIQUE INDEX "_NewsLocations_AB_unique" ON "_NewsLocations"("A", "B");

-- CreateIndex
CREATE INDEX "_NewsLocations_B_index" ON "_NewsLocations"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CourseLocations_AB_unique" ON "_CourseLocations"("A", "B");

-- CreateIndex
CREATE INDEX "_CourseLocations_B_index" ON "_CourseLocations"("B");
