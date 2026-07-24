-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_locationId_fkey";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "locationId",
ADD COLUMN     "allLocations" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_CustomerLocations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CustomerLocations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CustomerLocations_B_index" ON "_CustomerLocations"("B");

-- AddForeignKey
ALTER TABLE "_CustomerLocations" ADD CONSTRAINT "_CustomerLocations_A_fkey" FOREIGN KEY ("A") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerLocations" ADD CONSTRAINT "_CustomerLocations_B_fkey" FOREIGN KEY ("B") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

