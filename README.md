# Kana Dojo - Japanese Learning Platform

A gamified, adaptive Japanese learning platform featuring interactive flashcard games, Kanji study tools, and AI-powered reading passages.

## 🌟 Features

- **Interactive Flashcards**: Engaging flashcard system for vocabulary review
- **AI-Powered Reading Passages**: Contextual reading materials based on learned vocabulary
- **Comprehensive Dictionary Search**: Integrated Jisho dictionary with search capabilities  
- **Kanji Study**: Detailed Kanji mnemonics and radical breakdowns
- **Gamified Practice**: Three game modes (Pick, Type, Yomi) to reinforce learning
- **Spaced Repetition**: Smart review system for optimal memorization
- **PDF Import**: Automatically convert PDF study materials into flashcard decks
- **Multi-language Support**: Available in multiple languages with i18n

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd kana-dojo
   ```

2. Set up environment variables:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database and API credentials
   ```

3. Install dependencies:
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

4. Set up the database:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

5. Start the application:
   ```bash
   # Option 1: Using Docker Compose (recommended)
   docker-compose up
   
   # Option 2: Run separately
   # Terminal 1: Start backend
   cd backend && npm run dev
   
   # Terminal 2: Start frontend
   cd frontend && npm run dev
   ```

6. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

## 🏗️ Architecture

The application consists of two primary components:

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with Framer Motion animations
- **State Management**: Zustand (for flashcards and statistics)

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Webhooks**: Integrated with n8n workflows
- **File Processing**: PDF upload and parsing pipelines

### Key Features Overview
- **Flashcard Game Engine**: Contains pick-type-yomi game modes with scoring
- **Card Import Pipeline**: PDF upload → file detection → n8n processing → database insertion
- **Reading Generation**: AI-powered passage generation based on user vocabulary
- **Kanji Radicals System**: Comprehensive radical-based learning with WaniKani integration

## 🛠️ Development

### Backend Structure
```
backend/
├── src/
│   ├── controllers/     # Request handling logic
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic
│   ├── models/         # Database schema and interactions
│   └── middleware/     # Authentication, validation etc
├── prisma/            # Database schema definitions
└── uploads/           # Processed file storage
```

### Frontend Structure
```
frontend/
├── app/               # Next.js app router pages
├── features/          # Feature-based components
│   ├── Dictionary/
│   ├── Flashcards/
│   ├── Games/
│   └── KanjiStudy/
├── shared/            # Reusable components and hooks
└── public/            # Static assets and generated dictionary files
```

## 🧪 Testing

Run the test suites:
```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd backend
npm test
```

## 📚 Additional Documentation

For more detailed documentation, refer to:
- [Backend Architecture](./docs/backend_architecture.md)
- [Development Workflows](./docs/workflows.md)
- [Testing Strategy](./docs/testing_strategy.md)
- [Deployment Guide](./docs/deployment_guide.md)
- [API Documentation](./docs/api.md)
- [Internationalization Guide](./frontend/docs/TRANSLATION_GUIDE.md)

Complete documentation index: [Documentation Hub](./docs/index.md)

## 🤝 Contributing

See the [Contributing Guide](./frontend/docs/CONTRIBUTING-BEGINNERS.md) and our [Documentation Standards](./frontend/docs/DOCS_REORGANIZATION_PLAN.md) for more information.

## 📄 License

This project is licensed under the AGPL-3.0 License - see the [LICENSE.md](LICENSE.md) file for details.

## 🧠 Knowledge Base

This project utilizes GitNexus for code analysis and understanding. Refer to the [Agent Handover Document](../handover/HANDOVER_V2.md) for additional architectural insights and critical gotchas specific to this project.
