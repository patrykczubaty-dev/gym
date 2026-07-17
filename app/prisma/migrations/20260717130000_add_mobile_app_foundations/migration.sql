-- Mobile-App-Fundament: Customer-OTP-Login, Push-Token, Storno-Frist pro Kurs

ALTER TABLE "Customer"
  ADD COLUMN "otpCodeHash" TEXT,
  ADD COLUMN "otpExpiresAt" TIMESTAMP(3),
  ADD COLUMN "otpAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "expoPushToken" TEXT;

CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

ALTER TABLE "Course"
  ADD COLUMN "cancellationCutoffHours" INTEGER;
