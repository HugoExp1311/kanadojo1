-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
ADD COLUMN     "interval" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "next_review" TIMESTAMP(3),
ADD COLUMN     "repetitions" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "current_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_study_date" DATE;

-- CreateTable
CREATE TABLE "study_activities" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "cards_studied" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_activities_user_id_idx" ON "study_activities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_activities_user_id_date_key" ON "study_activities"("user_id", "date");

-- CreateIndex
CREATE INDEX "cards_next_review_idx" ON "cards"("next_review");

-- AddForeignKey
ALTER TABLE "study_activities" ADD CONSTRAINT "study_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
