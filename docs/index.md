# Kana Dojo Documentation Index

Welcome to the official documentation for the Kana Dojo Japanese Learning Platform. This index provides comprehensive access to all project documentation, from architecture to development workflows.

## 📚 Main Project Information
- [README](../README.md) - Overview, quick start, and feature summary
- [Project Licensing](../LICENSE.md) - AGPL-3.0 license information
- [Code of Conduct](../CODE_OF_CONDUCT.md) - Community guidelines
- [Agent Handover](../handover/HANDOVER_V2.md) - Critical architectural notes and gotchas for agents working with the project

## 🏗️ Architecture & Design

### System Architecture
- [Architecture Overview](./frontend/docs/ARCHITECTURE.md) - Frontend architecture and patterns
- [Backend Architecture](./backend_architecture.md) - Backend services, APIs, and data layers
- [State Management](./frontend/docs/STATE_MANAGEMENT.md) - How state is managed throughout the application
- [UI Design Guide](./frontend/docs/UI_DESIGN.md) - Styling system, theming, and component patterns

### Data Flow & APIs
- [API Documentation](./api.md) - Complete API reference for frontend/backend communication
- [Data Models](./data_models.md) - Database schema and data flow documentation
- [Service Layers](./services.md) - Back-end services and their responsibilities

## 🛠️ Development

### Getting Started
- [Contributing Guide](./frontend/docs/CONTRIBUTING-BEGINNERS.md) - Development setup and contribution process
- [Environment Setup](./environment_setup.md) - Complete environment configuration guide

### Core Development Processes
- [Developer Workflows](./workflows.md) - Standard development processes and best practices
- [Testing Strategy](./testing_strategy.md) - Unit tests, E2E tests, and coverage policies
- [Code Standards](./code_standards.md) - Language-specific style guides and conventions
- [Git Workflows](./git_workflows.md) - Branching, merging, and release procedures

### Feature-Specific Docs
- [Flashcard System](./flashcard_system.md) - Implementation details for the flashcard game engine
- [Kanji Study Features](./kanji_features.md) - Radicals, mnemonics, and WaniKani integration
- [Reading Generation](./reading_generation.md) - AI-powered reading passage creation
- [Dictionary Integration](./dictionary_integration.md) - Jisho API integration and search functionality

## 🚀 Deployment & Operations

### Setup & Configuration
- [Deployment Guide](./deployment_guide.md) - Full stack deployment configurations
- [Docker Configuration](./docker_setup.md) - Container orchestration and volume mounting
- [Database Management](./database_operations.md) - Schema migrations, seeding, and maintenance

### Monitoring & Maintenance
- [Performance Optimizations](./frontend/docs/PERFORMANCE_OPTIMIZATIONS.md) - Optimization strategies
- [Troubleshooting Guide](./frontend/docs/TROUBLESHOOTING.md) - Common issues and solutions

## 🧪 Testing Documentation
- [Testing Strategy](./testing_strategy.md) - Complete testing approach and frameworks used
- [Test Writing Guidelines](./test_guidelines.md) - How to write effective tests for this project

## 🌍 Localization & Internationalization
- [i18n Guide](./frontend/docs/TRANSLATION_GUIDE.md) - Multilingual support implementation
- [Adding New Languages](./frontend/docs/ADDING_LANGUAGES.md) - Process for introducing new supported languages
- [Translation Scripts](./frontend/docs/I18N_SCRIPTS.md) - Automation for updating localization

## ♿ Accessibility
- [Accessibility Standards](./frontend/docs/ACCESSIBILITY.md) - Web accessibility implementation

## 🎯 Game-Specific Documentation
- [Achievement System](./frontend/docs/ACHIEVEMENTS.md) - Badge progression and rewards overview
- [Game Modes](./game_modes.md) - Detailed explanation of Pick, Type, and Yomi modes

## 🔧 Technical Utilities
- [GitHub Workflows](./frontend/docs/GITHUB_WORKFLOWS.md) - CI/CD pipeline documentation
- [Performance Optimizations](./frontend/docs/PERFORMANCE_OPTIMIZATIONS.md) - Build optimization and dev server performance
- [Audio Implementation](./frontend/docs/AUDIO_OPTIMIZATION.md) - Text-to-speech and audio system details

## 📁 Legacy Documentation
- [Documentation Reorganization Plan](./frontend/docs/DOCS_REORGANIZATION_PLAN.md) - Historical documentation organization strategy

---

## Quick Navigation
```
kana-dojo/
├── backend/                    # Server implementation (Express, Prisma, PostgreSQL)
├── frontend/                   # Client application (Next.js, Zustand, Tailwind)
├── docker-compose.yml         # Container orchestration
├── docs/                      # This documentation hub
└── handover/                  # Agent handover documentation
```

Need help? Open an issue in the repository or consult the [Agent Handover](../handover/HANDOVER_V2.md) for AI agent-specific guidance.
