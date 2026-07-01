-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN "razorpayOrderId" TEXT,
ADD COLUMN "razorpayPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_razorpayPaymentId_key" ON "ServiceRequest"("razorpayPaymentId");
