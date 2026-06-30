-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'nurse', 'admin');

-- CreateEnum
CREATE TYPE "AdminTier" AS ENUM ('admin', 'super_admin');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('nurse_visit', 'doctor_consult', 'physiotherapy', 'iv_drip', 'wound_care', 'elderly_care', 'emergency');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "adminTier" "AdminTier",
    "accountKinds" TEXT[] DEFAULT ARRAY['patient']::TEXT[],
    "caregiverCategory" "ServiceType",
    "serviceSectionId" TEXT,
    "specialization" TEXT,
    "licenseNumber" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "accountActive" BOOLEAN NOT NULL DEFAULT true,
    "profilePhotoUrl" TEXT,
    "about" TEXT,
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "notifyNewJobs" BOOLEAN NOT NULL DEFAULT true,
    "notifySms" BOOLEAN NOT NULL DEFAULT false,
    "expoPushToken" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.8,
    "visitRate" INTEGER NOT NULL DEFAULT 599,
    "payoutMethod" TEXT,
    "payoutAccountHolder" TEXT,
    "payoutBankName" TEXT,
    "payoutAccountNumber" TEXT,
    "payoutIfsc" TEXT,
    "payoutUpiId" TEXT,
    "policyholderName" TEXT,
    "policyNumber" TEXT,
    "healthCardId" TEXT,
    "patientFullName" TEXT,
    "patientDateOfBirth" DATE,
    "patientGender" TEXT,
    "relationshipToPolicyholder" TEXT,
    "healthProfile" JSONB NOT NULL DEFAULT '{}',
    "emergencyContacts" JSONB NOT NULL DEFAULT '[]',
    "guardianContactName" TEXT,
    "guardianContactEmail" TEXT,
    "guardianContactPhone" TEXT,
    "lng" DOUBLE PRECISION NOT NULL DEFAULT 77.5946,
    "lat" DOUBLE PRECISION NOT NULL DEFAULT 12.9716,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianPatientLink" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianPatientLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareServiceOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "rate" INTEGER NOT NULL DEFAULT 0,
    "serviceType" "ServiceType" NOT NULL DEFAULT 'nurse_visit',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareServiceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NurseCareOffering" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "careServiceOptionId" TEXT NOT NULL,
    "rate" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NurseCareOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientBookingCart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientBookingCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nurseId" TEXT,
    "serviceType" "ServiceType" NOT NULL,
    "notes" TEXT,
    "lng" DOUBLE PRECISION NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rating" INTEGER,
    "feedback" TEXT,
    "feeAmount" INTEGER,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitOtp" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "nurseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_role_available_idx" ON "User"("role", "available");

-- CreateIndex
CREATE INDEX "GuardianPatientLink_guardianId_idx" ON "GuardianPatientLink"("guardianId");

-- CreateIndex
CREATE INDEX "GuardianPatientLink_patientId_idx" ON "GuardianPatientLink"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianPatientLink_guardianId_patientId_key" ON "GuardianPatientLink"("guardianId", "patientId");

-- CreateIndex
CREATE INDEX "CareServiceOption_serviceType_active_sortOrder_idx" ON "CareServiceOption"("serviceType", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "NurseCareOffering_userId_idx" ON "NurseCareOffering"("userId");

-- CreateIndex
CREATE INDEX "NurseCareOffering_careServiceOptionId_idx" ON "NurseCareOffering"("careServiceOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "NurseCareOffering_userId_careServiceOptionId_key" ON "NurseCareOffering"("userId", "careServiceOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientBookingCart_userId_key" ON "PatientBookingCart"("userId");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");

-- CreateIndex
CREATE INDEX "ServiceRequest_userId_idx" ON "ServiceRequest"("userId");

-- CreateIndex
CREATE INDEX "ServiceRequest_nurseId_idx" ON "ServiceRequest"("nurseId");

-- CreateIndex
CREATE INDEX "VisitOtp_requestId_idx" ON "VisitOtp"("requestId");

-- CreateIndex
CREATE INDEX "VisitOtp_expiresAt_idx" ON "VisitOtp"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VisitOtp_requestId_purpose_key" ON "VisitOtp"("requestId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetOtp_email_key" ON "PasswordResetOtp"("email");

-- CreateIndex
CREATE INDEX "PasswordResetOtp_expiresAt_idx" ON "PasswordResetOtp"("expiresAt");

-- AddForeignKey
ALTER TABLE "GuardianPatientLink" ADD CONSTRAINT "GuardianPatientLink_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianPatientLink" ADD CONSTRAINT "GuardianPatientLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseCareOffering" ADD CONSTRAINT "NurseCareOffering_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseCareOffering" ADD CONSTRAINT "NurseCareOffering_careServiceOptionId_fkey" FOREIGN KEY ("careServiceOptionId") REFERENCES "CareServiceOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBookingCart" ADD CONSTRAINT "PatientBookingCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

