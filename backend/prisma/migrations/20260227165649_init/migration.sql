-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'processing',
    "data_path" VARCHAR(500),
    "card_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" SERIAL NOT NULL,
    "flashcard_id" INTEGER NOT NULL,
    "word" VARCHAR(255) NOT NULL,
    "meaning" TEXT NOT NULL,
    "reading" VARCHAR(255),
    "example_sentence" TEXT,
    "en_example" TEXT,
    "example_reading" TEXT,
    "jlpt_level" VARCHAR(10),
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_sessions" (
    "id" SERIAL NOT NULL,
    "flashcard_id" INTEGER NOT NULL,
    "jlptLevel" VARCHAR(10) NOT NULL,
    "difficulty" VARCHAR(20) NOT NULL,
    "theme" VARCHAR(255) NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "flashcards_user_id_idx" ON "flashcards"("user_id");

-- CreateIndex
CREATE INDEX "flashcards_status_idx" ON "flashcards"("status");

-- CreateIndex
CREATE UNIQUE INDEX "flashcards_user_id_lesson_name_key" ON "flashcards"("user_id", "lesson_name");

-- CreateIndex
CREATE INDEX "cards_flashcard_id_idx" ON "cards"("flashcard_id");

-- CreateIndex
CREATE INDEX "cards_flashcard_id_order_idx" ON "cards"("flashcard_id", "order");

-- CreateIndex
CREATE INDEX "reading_sessions_flashcard_id_idx" ON "reading_sessions"("flashcard_id");

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
