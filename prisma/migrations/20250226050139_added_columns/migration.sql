/*
  Warnings:

  - You are about to drop the column `compliance` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "compliant" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "compliant" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "compliance",
ADD COLUMN     "compliant" BOOLEAN NOT NULL DEFAULT false;
