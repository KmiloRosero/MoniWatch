-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CC', 'CE', 'NIT', 'PP', 'TI');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('NEQUI', 'WOMPI');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('WALLET', 'CARD', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('PENDING_VALIDATION', 'ACTIVE', 'EXPIRED', 'REVOKED', 'FAILED_VALIDATION');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('COP', 'USD');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPROVED', 'DECLINED', 'FAILED', 'VOIDED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TransactionChannel" AS ENUM ('WATCH', 'MOBILE', 'WEB');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('WEAR_OS', 'WATCH_OS');

-- CreateEnum
CREATE TYPE "DeviceSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DevicePairingStatus" AS ENUM ('PENDING', 'APPROVED', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "paymentPinHash" TEXT,
    "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,
    "pinLockedUntil" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "status" "PaymentMethodStatus" NOT NULL DEFAULT 'PENDING_VALIDATION',
    "alias" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "displayLabel" TEXT NOT NULL,
    "last4" TEXT,
    "cardBrand" TEXT,
    "cardExpMonth" INTEGER,
    "cardExpYear" INTEGER,
    "maskedPhoneNumber" TEXT,
    "encryptedToken" TEXT NOT NULL,
    "tokenIv" TEXT NOT NULL,
    "tokenAuthTag" TEXT NOT NULL,
    "encryptionKeyId" TEXT NOT NULL,
    "tokenFingerprint" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "providerSourceId" TEXT,
    "providerCustomerId" TEXT,
    "providerMetadata" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "category" TEXT,
    "status" "MerchantStatus" NOT NULL DEFAULT 'ACTIVE',
    "providerMerchantId" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "merchantId" TEXT,
    "deviceSessionId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "channel" "TransactionChannel" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amountInCents" INTEGER NOT NULL,
    "feeInCents" INTEGER NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL,
    "description" TEXT,
    "providerTransactionId" TEXT,
    "providerStatus" TEXT,
    "providerResponse" JSONB,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_status_history" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "fromStatus" "TransactionStatus",
    "toStatus" "TransactionStatus" NOT NULL,
    "reason" TEXT,
    "source" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "status" "DeviceSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "devicePublicKey" TEXT,
    "pairedAt" TIMESTAMP(3),
    "refreshTokenHash" TEXT,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "maxAmountPerTransaction" INTEGER,
    "dailyLimitInCents" INTEGER,
    "requirePinAboveInCents" INTEGER,
    "defaultPaymentMethodId" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastIpAddress" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_pairing_requests" (
    "id" TEXT NOT NULL,
    "status" "DevicePairingStatus" NOT NULL DEFAULT 'PENDING',
    "userCodeHash" TEXT NOT NULL,
    "deviceCodeHash" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "devicePublicKey" TEXT,
    "userId" TEXT,
    "deviceSessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastPolledAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_pairing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "payload" JSONB NOT NULL,
    "processingStatus" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "processingError" TEXT,
    "transactionId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_documentType_documentNumber_key" ON "users"("documentType", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refreshTokenHash_key" ON "user_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "user_sessions_userId_revokedAt_idx" ON "user_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "payment_methods_userId_status_idx" ON "payment_methods"("userId", "status");

-- CreateIndex
CREATE INDEX "payment_methods_provider_providerSourceId_idx" ON "payment_methods"("provider", "providerSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_userId_provider_tokenFingerprint_key" ON "payment_methods"("userId", "provider", "tokenFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_taxId_key" ON "merchants"("taxId");

-- CreateIndex
CREATE INDEX "merchants_status_idx" ON "merchants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "transactions_userId_createdAt_idx" ON "transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_deviceSessionId_idx" ON "transactions"("deviceSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_userId_idempotencyKey_key" ON "transactions"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_provider_providerTransactionId_key" ON "transactions"("provider", "providerTransactionId");

-- CreateIndex
CREATE INDEX "transaction_status_history_transactionId_createdAt_idx" ON "transaction_status_history"("transactionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "device_sessions_refreshTokenHash_key" ON "device_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "device_sessions_userId_status_idx" ON "device_sessions"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "device_sessions_userId_deviceId_key" ON "device_sessions"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "device_pairing_requests_userCodeHash_key" ON "device_pairing_requests"("userCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "device_pairing_requests_deviceCodeHash_key" ON "device_pairing_requests"("deviceCodeHash");

-- CreateIndex
CREATE INDEX "device_pairing_requests_status_expiresAt_idx" ON "device_pairing_requests"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "webhook_events_processingStatus_idx" ON "webhook_events"("processingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_providerEventId_key" ON "webhook_events"("provider", "providerEventId");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES "device_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_status_history" ADD CONSTRAINT "transaction_status_history_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_pairing_requests" ADD CONSTRAINT "device_pairing_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_pairing_requests" ADD CONSTRAINT "device_pairing_requests_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES "device_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
