-- Cash on delivery payment method for bookings
ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'online';

CREATE INDEX IF NOT EXISTS "ServiceRequest_paymentMethod_idx" ON "ServiceRequest"("paymentMethod");
