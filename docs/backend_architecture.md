# Backend Architecture Documentation

This document provides an in-depth overview of the Kana Dojo backend architecture, including API endpoints, service layers, database schema, and integration patterns.

## 🏗️ Overall Architecture

The backend serves multiple client applications and provides a RESTful API built on Node.js, Express.js, and TypeScript. All data is persisted in a PostgreSQL database with Prisma as the ORM.

### Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript (compiled to JavaScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Webhooks**: n8n automated workflows
- **File Storage**: Local filesystem (bind-mounted Docker volume)

### Directory Structure
```
backend/
├── src/
│   ├── controllers/        # Route handlers, business logic abstractions
│   ├── routes/            # API endpoint definitions with middleware  
│   ├── models/            # Business logic (deprecated in favor of /services)
│   ├── services/          # Core services and business logic (replaces /models)
│   ├── middleware/        # Authentication, rate limiting, logging
│   ├── utils/             # Shared utilities and helper functions
│   └── config/            # Configuration & environment utilities
├── prisma/
│   ├── schema.prisma      # Database schema definition
│   └── seeds/             # Database seeding scripts
├── uploads/               # File upload storage (bind-mounted volume)
├── dist/                  # Compiled output directory
└── scripts/               # Automation and utilities
```

## 🗄️ Database Schema

The database schema is defined in `prisma/schema.prisma` and contains several key models:

### Core Models

#### User
Base model for application users with authentication properties

#### Flashcard
- Stores vocabulary pairs (`term`/`meaning`)
- References to deck that contains it
- SRS (Spaced Repetition System) values (leitner box, next review date)
- Metadata (created, updated, status flags)

#### Deck
- Collection of flashcards
- Tracks metadata: creation date, language level, type
- User ownership for custom decks

#### Reading
- AI-generated reading passages stored with full content
- Associated with a user (could be in user decks or general pool)

#### Stats
- Tracks user learning metrics, progress statistics
- Stores streaks, reviews, retention data

#### KanjiMnemonic (DEPRECATED)
- Contains deprecated feature (mnemonic generation decommissioned)
- Remains for compatibility with existing stored mnemonics

### Schema Relations
```
User 1 ---- * Deck
Deck 1 ---- * Flashcard
Flashcard 1 ---- * Reading (via associations)
User 1 ---- * Stats
```

## 🌐 API Routes

All API routes follow a consistent structure returning JSON responses. The primary entry point is `/src/app.ts` which configures Express with all middleware and route definitions.

### Core Endpoints

#### Authentication (`/api/auth`)
- `POST /signup` - User registration
- `POST /login` - Authentication with JWT token
- `POST /logout` - Session termination
- `GET /profile` - User profile retrieval (requires auth)

#### Flashcards (`/api/flashcards`)
- `GET /dashboard` - Dashboard information with statistics
- `GET /:id/data` - Retrieve specific flashcard data (returns both JP and EN versions with same ID)
- `GET /review` - Fetch cards needing review based on SRS algorithm  
- `POST /:id/review` - Submit review rating and update SRS state
- `PUT /cards/import` - Import flashcards from bulk data

#### Decks (`/api/decks`)
- `GET /` - List user accessible decks
- `GET /:id` - Get single deck with associated metadata
- `POST /create` - Create custom user deck
- `PUT /:id` - Modify deck information
- `DELETE /:id` - Delete deck (users can only delete their own decks)

#### PDF Import Processing (`/api/upload`)  
- `POST /` - Upload PDF file for processing
- `GET /status/:sessionId` - Check processing progress
- Relies on pollingService to monitor completed files in uploads directory

#### Dictionary Search (`/api/dictionary`)
- `GET /search?term=` - Search dictionary for single terms using integrated Jisho API

#### Reading (`/api/readings`)
- `GET /:id` - Fetch individual reading passage
- `GET /deck/:deckId` - Get all readings associated with a deck
- `POST /generate` - Request new AI-generated reading passage
- `GET /status/:requestId` - Poll for reading generation status

## 🔧 Service Layer Design

### Services (`/src/services/`)
Instead of placing logic in models, business operations are encapsulated in services:

#### Polling Service
- Monitors `./uploads` directory for data files from n8n
- Checks for `data.json` created from PDF processor
- Updates flashcard statuses when data becomes available

#### Card Import Service  
- Processes `data.json` files according to contract
- Expects flat array of alternating `type: "en"` and `type: "jp"` objects
- Ensures atomic database operations via transactions

#### Filesystem Service
- Handles file I/O concerns in the upload pipeline
- Coordinates with pollingService to detect when files are ready

### Controllers (`/src/controllers/`)
Provide request/response abstraction from services using Express.js req/res objects:

#### authController
Authentication handling including registration, login, and JWT management

#### flashcardController
Wraps card service functionality with validation and authorization

#### deckController
Handle deck-related CRUD operations

## 🔄 Data Processing Pipelines

### PDF Upload → Flashcards Pipeline

1. User uploads PDF via POST to `/api/upload`
2. File saved to local `./uploads/session-{id}.pdf` with a session ID
3. File detection mechanism adds entry to the database with `processing` status
4. Processing begins in n8n which extracts vocabulary pairs
5. n8n creates `data.json` file with structured vocab data
6. Polling service detects file and calls card import service
7. Cards status updated from `processing` → `ready`

**Note**: For this pipeline to function, both `pollingService` and `filesystemService` must remain operational.

### Reading Generation Pipeline

1. API receives `POST /api/readings/generate` with learning parameters
2. Generates request_id and sets initial status
3. Calls n8n via webhook with parameters
4. n8n processes and creates reading JSON file
5. Backend serves completed reading to user

## 🔒 Security Considerations

### Authentication & Authorization
- JWT tokens used throughout system
- Session-based login/logout flow
- Route-level middleware prevents unauthorized access

### Input Sanitization  
- Query params validated via middleware
- Content filtered through prisma queries
- File upload restrictions applied

### Data Validation
- Strong TypeScript typing throughout
- Runtime validation for API inputs and service layer boundaries
- Prisma-level constraint enforcement

## 🚀 Production Deployments

### Docker Composition
The application is deployed using Docker Compose which orchestrates:
- Frontend Next.js app serving on port 3000
- Backend API service on port 4000
- PostgreSQL database service mapping to port 5432
- Local persistent data in bind-mounted volumes

### Database Initialization
On every backend container startup:
1. `init-db.js` executes automatically
2. Prisma runs `migrate deploy` to reflect latest schema
3. Admin user seeded if it doesn't exist

## 🧪 Testing Patterns

### Backend Test Strategy
Backend tests typically focus on isolated unit functions in services, controller integration tests, and API contract validations. Mocking used extensively to isolate business logic from side-effecting operations.

## 🧭 Evolution & Known Constraints

### Decommissioned Features
Several services have been retired but maintained for compatibility:
- `POST /flashcards/:id/mnemonics/generate` - Former AI mnemonic generation (now returns 410 Gone)
- `POST /flashcards/:id/kanji-mnemonics/generate` - Kanji-specific generation (also returns 410 Gone)

While the POST endpoints were removed, stored mnemonics via `GET /kanji-mnemonics` is still active so frontend can alternate between AI and WaniKani sources.

### Data Contract Requirements
When sending data to n8n endpoint, special care required for data structures:
- Array-of-objects structures are stringified during transport, becoming "[object Object]"
- Flatten arrays before sending

### Flashcard Data Structure (Critical)
Important structural requirement from frontend perspective: every database flashcard generates **two** API results with the **same ID**: one with `type: "jp"` and one with `type: "en"` for that vocabulary pair. This allows clients to pair Japanese/English representations together by ID.

---

This architecture was designed to support gamified, adaptive Japanese learning with efficient vocabulary handling, automated content generation, and scalable flashcard algorithms while maintaining separation of frontend and backend concerns.
