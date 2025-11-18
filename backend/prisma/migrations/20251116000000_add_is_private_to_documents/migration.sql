-- AlterTable
ALTER TABLE "documents" ADD COLUMN "is_private" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "documents_mimeType_idx" ON "documents"("mimeType");

-- CreateIndex
CREATE INDEX "documents_is_private_idx" ON "documents"("is_private");

