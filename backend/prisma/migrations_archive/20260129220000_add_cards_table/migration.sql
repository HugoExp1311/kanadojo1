-- CreateTable
CREATE TABLE "cards" (
    "id" SERIAL NOT NULL,
    "flashcard_id" INTEGER NOT NULL,
    "word" VARCHAR(255) NOT NULL,
    "meaning" TEXT NOT NULL,
    "reading" VARCHAR(255),
    "pronunciation" VARCHAR(255),
    "example_sentence" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cards_flashcard_id_idx" ON "cards"("flashcard_id");

-- CreateIndex
CREATE INDEX "cards_flashcard_id_order_idx" ON "cards"("flashcard_id", "order");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
