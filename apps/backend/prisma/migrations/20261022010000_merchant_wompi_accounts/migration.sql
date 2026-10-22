-- CreateEnum
CREATE TYPE "WompiEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- AlterTable
ALTER TABLE "merchants" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "ownerUserId" TEXT,
ADD COLUMN     "wompiEnvironment" "WompiEnvironment",
ADD COLUMN     "wompiPublicKey" TEXT,
ADD COLUMN     "wompiSecrets" TEXT,
ADD COLUMN     "wompiSecretsAuthTag" TEXT,
ADD COLUMN     "wompiSecretsIv" TEXT,
ADD COLUMN     "wompiSecretsKeyId" TEXT;

-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "merchantId" TEXT;

-- CreateTable
CREATE TABLE "saved_merchants" (
    "userId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_merchants_pkey" PRIMARY KEY ("userId","merchantId")
);

-- CreateIndex
CREATE INDEX "saved_merchants_merchantId_idx" ON "saved_merchants"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_code_key" ON "merchants"("code");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_wompiPublicKey_key" ON "merchants"("wompiPublicKey");

-- CreateIndex
CREATE INDEX "merchants_ownerUserId_idx" ON "merchants"("ownerUserId");

-- CreateIndex
CREATE INDEX "payment_methods_merchantId_idx" ON "payment_methods"("merchantId");

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_merchants" ADD CONSTRAINT "saved_merchants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_merchants" ADD CONSTRAINT "saved_merchants_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

