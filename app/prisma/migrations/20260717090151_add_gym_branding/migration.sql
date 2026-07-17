-- Branding (White-Label) Felder auf Gym
ALTER TABLE "Gym"
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "logoOnDarkUrl" TEXT,
  ADD COLUMN "logoOnLightUrl" TEXT,
  ADD COLUMN "faviconUrl" TEXT,
  ADD COLUMN "loginClaim" TEXT,
  ADD COLUMN "primaryColor" TEXT,
  ADD COLUMN "accentColor" TEXT;
