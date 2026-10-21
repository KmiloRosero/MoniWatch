/*
  Warnings:

  - You are about to drop the column `pairingCodeHash` on the `device_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `pairingExpiresAt` on the `device_sessions` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "device_pairing_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "userCodeHash" TEXT NOT NULL,
    "deviceCodeHash" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "devicePublicKey" TEXT,
    "userId" TEXT,
    "deviceSessionId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "lastPolledAt" DATETIME,
    "approvedAt" DATETIME,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "device_pairing_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "device_pairing_requests_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES "device_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_device_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "devicePublicKey" TEXT,
    "pairedAt" DATETIME,
    "refreshTokenHash" TEXT,
    "refreshTokenExpiresAt" DATETIME,
    "maxAmountPerTransaction" INTEGER,
    "dailyLimitInCents" INTEGER,
    "requirePinAboveInCents" INTEGER,
    "defaultPaymentMethodId" TEXT,
    "lastSeenAt" DATETIME,
    "lastIpAddress" TEXT,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "device_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_device_sessions" ("appVersion", "createdAt", "dailyLimitInCents", "defaultPaymentMethodId", "deviceId", "deviceModel", "deviceName", "devicePublicKey", "id", "lastIpAddress", "lastSeenAt", "maxAmountPerTransaction", "osVersion", "pairedAt", "platform", "refreshTokenExpiresAt", "refreshTokenHash", "requirePinAboveInCents", "revokedAt", "revokedReason", "status", "updatedAt", "userId") SELECT "appVersion", "createdAt", "dailyLimitInCents", "defaultPaymentMethodId", "deviceId", "deviceModel", "deviceName", "devicePublicKey", "id", "lastIpAddress", "lastSeenAt", "maxAmountPerTransaction", "osVersion", "pairedAt", "platform", "refreshTokenExpiresAt", "refreshTokenHash", "requirePinAboveInCents", "revokedAt", "revokedReason", "status", "updatedAt", "userId" FROM "device_sessions";
DROP TABLE "device_sessions";
ALTER TABLE "new_device_sessions" RENAME TO "device_sessions";
CREATE UNIQUE INDEX "device_sessions_refreshTokenHash_key" ON "device_sessions"("refreshTokenHash");
CREATE INDEX "device_sessions_userId_status_idx" ON "device_sessions"("userId", "status");
CREATE UNIQUE INDEX "device_sessions_userId_deviceId_key" ON "device_sessions"("userId", "deviceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "device_pairing_requests_userCodeHash_key" ON "device_pairing_requests"("userCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "device_pairing_requests_deviceCodeHash_key" ON "device_pairing_requests"("deviceCodeHash");

-- CreateIndex
CREATE INDEX "device_pairing_requests_status_expiresAt_idx" ON "device_pairing_requests"("status", "expiresAt");
