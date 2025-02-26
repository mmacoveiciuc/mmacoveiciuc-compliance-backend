-- CreateTable
CREATE TABLE "ComplianceLog" (
    "id" SERIAL NOT NULL,
    "org" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "previous" TEXT NOT NULL,
    "current" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceLog_org_idx" ON "ComplianceLog"("org");
