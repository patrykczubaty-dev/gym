-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "waitlistLimit" INTEGER;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "defaultCourseDurationMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "defaultWaitlistLimit" INTEGER;
