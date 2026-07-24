-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_locationId_fkey";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "locationId";

-- CreateTable
CREATE TABLE "_EmployeeLocations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EmployeeLocations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EmployeeLocations_B_index" ON "_EmployeeLocations"("B");

-- AddForeignKey
ALTER TABLE "_EmployeeLocations" ADD CONSTRAINT "_EmployeeLocations_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeLocations" ADD CONSTRAINT "_EmployeeLocations_B_fkey" FOREIGN KEY ("B") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
