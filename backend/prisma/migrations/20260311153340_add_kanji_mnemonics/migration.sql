-- CreateTable
CREATE TABLE "kanji_mnemonics" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "kanji_char" VARCHAR(4) NOT NULL,
    "radical_names" TEXT NOT NULL,
    "mnemonic" TEXT NOT NULL,
    "flashcard_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kanji_mnemonics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kanji_mnemonics_user_id_idx" ON "kanji_mnemonics"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "kanji_mnemonics_user_id_kanji_char_key" ON "kanji_mnemonics"("user_id", "kanji_char");
