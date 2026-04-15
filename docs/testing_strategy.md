# Testing Strategy

This document outlines the comprehensive approach to testing in the Kana Dojo project, covering unit, integration, and end-to-end testing strategies for the frontend and backend components.

## 🔬 Philosophy

Our testing approach focuses on:

- **Speed and Reliability**: Fast, deterministic tests that provide rapid feedback
- **Maintainability**: Clear, readable tests that are easy to update
- **Coverage**: Focused coverage on critical pathways, not arbitrary percentages
- **Confidence**: Tests that provide confidence to ship new features and refactor existing code

## 🧪 Testing Types

### Unit Tests
Unit tests verify isolated functionality of individual functions and classes. Primary targets:

- Utility functions in `frontend/shared/utils/`
- Small UI components in `frontend/components/`
- Service methods from `backend/src/services/`
- Controller business logic in `backend/src/controllers/`

### Integration Tests
Integration tests verify components working together without the need to run the full application:

- API endpoints with mocked databases (backend)
- Component integration with hooks/stores (frontend)
- Database model interactions (backend)
- Full feature flows without 3rd party services

### End-to-End Tests
E2E tests validate complete user workflows from a user perspective:

- Critical user journeys (registration, flashcard studying)
- Complex feature interactions
- Cross-platform testing between different browsers
- External API integration validation

## 📁 File Organization

### Frontend Tests
Tests are co-located with the code they test following the pattern `**/*.test.{ts,tsx}`:

```
frontend/
├── features/
│   ├── Flashcards/
│   │   ├── components/
│   │   │   ├── FlashcardGame.test.tsx
│   │   │   ├── FlashcardView.test.tsx
│   │   │   └── GameModes/
│   │   │       ├── Pick.test.tsx
│   │   │       ├── Input.test.tsx
│   │   │       └── Yomi.test.tsx
│   │   ├── hooks/
│   │   │   ├── useFlashcardStore.test.ts
│   │   │   └── useGameLogic.test.ts
│   │   └── services/
│       │   ├── cardService.test.ts
│       │   └── userProgress.test.ts
└── shared/
    ├── components/
    │   ├── Button.test.tsx
    │   └── Modal.test.tsx
    └── utils/
        ├── helperFunctions.test.ts
        └── validators.test.ts
```

### Backend Tests
Backend tests also use a co-location strategy where it makes sense, though larger test suites are sometimes centralized:

```
backend/
├── src/
│   ├── controllers/
│   │   ├── authController.test.ts
│   │   └── flashcardController.test.ts
│   ├── routes/
│   │   ├── authRoutes.test.ts
│   │   └── flashcardRoutes.test.ts
│   ├── services/
│   │   ├── authService.test.ts
│   │   └── cardImportService.test.ts
│   └── utils/
│       └── validators.test.ts
├── __tests__/
│   ├── integrations/
│   │   ├── api.test.ts
│   │   └── auth-flow.test.ts
│   └── fixtures/
│       ├── mock-data.ts
│       └── helpers.ts
```

## 🚀 Running Tests

### Frontend Tests
```bash
# Run all frontend tests
cd frontend
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test FlashcardGame.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="Flashcard.*creation"
```

### Backend Tests
```bash
# Run all backend tests
cd backend
npm test

# Run tests with coverage reports
npm run test:coverage

# Run specific test files or patterns
npm test authController
```

## 🧩 Testing Frameworks & Tools

### Frontend Stack
- **Testing Framework**: Jest
- **UI Testing**: React Testing Library (cleanup after every test)
- **Assertions**: Jest expectations
- **Mocking**: Jest built-in mocks + MSW (Mock Service Worker)
- **Component Snapshots**: Limited use, only for complex UI states
- **E2E**: Playwright

### Backend Stack
- **Testing Framework**: Jest
- **HTTP Testing**: SuperTest for API endpoint testing
- **Database Fixtures**: Prisma seed data, in-memory databases
- **Mocking**: Jest built-in mocks and Sinon (when needed)
- **Assertions**: Jest expectations

## ✅ Test Standards

### Naming Convention
Consistent naming helps developers quickly identify test files and functions:

```typescript
// ✓ Good - Descriptive name following given-when-then pattern
describe('useGameLogic hook', () => {
  test('increases score when correct answer is submitted', () => {
    // arrange: setup test conditions
    // act: perform the action to test
    // assert: verify the expected outcome
  })
})

// ✓ Good - Descriptive assertion name
test('filters cards by due date in review mode', () => {
  // test code
})
```

### Structure
Write tests in three clear sections: Arrange, Act, Assert (or Given, When, Then):

```typescript
test('submits correct answer and updates score', () => {
  // Arrange - Set up the component in the desired state
  const { getByText, getByRole } = render(<FlashcardGame deckId={testDeck.id} />)
  const initialScore = 0
  
  // Act - Perform the action
  fireEvent.click(getByText('Correct Answer'))
  
  // Assert - Verify the outcome
  expect(getByRole('heading', { name: /Score: 1/i })).toBeInTheDocument()
})
```

### Mocking Patterns
Use dependency injection and React Testing Library patterns to maintain test effectiveness:

```typescript
// ✓ Good - Use React Testing Library utilities for realistic interactions
test('calls onSubmit when form is submitted', () => {
  const handleSubmit = jest.fn()
  
  const { getByRole } = render(<LoginForm onSubmit={handleSubmit} />)
  
  userEvent.type(getByRole('textbox', { name: /email/i }), 'test@example.com')
  userEvent.type(getByRole('textbox', { name: /password/i }), 'password123')
  userEvent.click(getByRole('button', { name: /log in/i }))
  
  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123'
  })
})
```

### Accessibility Testing
Verify components meet accessibility standards:

```typescript
// Test important accessibility attributes are rendered correctly
test('flashcard has proper contrast ratio and focus management', () => {
  const { container } = render(<FlashcardView flashcard={sampleCard} />)
  
  // Check container has no accessibility violations
  const results = await axe(container)
  expect(results).toHaveNoViolations()
  
  // Test keyboard navigation works as expected
  const flipButton = screen.getByRole('button', { name: /flip card/i })
  expect(flipButton).toHaveFocus()
})
```

## 🔍 Test Categories

### Component Tests (Frontend)
Focus on user interactions and visual state changes rather than internal implementation:

```typescript
// ✓ Tests what user sees and experiences
test('shows hint when requested by user', () => {
  render(<FlashcardWithHints flashcard={card} />)
  
  userEvent.click(screen.getByRole('button', { name: /show hint/i }))
  
  expect(screen.getByText(card.hint)).toBeInTheDocument()
})

// ✗ Avoid testing implementation details 
// test('sets internal _hintVisible to true', () => { ... })  // Don't do this
```

### API Tests (Backend)
Verify that API endpoints behave correctly with valid and invalid inputs:

```typescript
// Test with good data and responses
test('creates new deck when user is authenticated', async () => {
  const user = await createTestUser()
  
  const response = await request(app)
    .post('/api/decks/create')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ name: 'My New Deck', languageLevel: 'N5' })
    
  expect(response.status).toBe(201)
  expect(response.body.name).toBe('My New Deck')
})

// Test with bad data and error cases
test('returns 400 for unauthenticated deck creation', async () => {
  const response = await request(app)
    .post('/api/decks/create')
    .send({ name: 'Invalid attempt' })
    
  expect(response.status).toBe(401)
})
```

### Integration Tests
Verify multiple components work together correctly:

```typescript
// Test a complete user flow
test('user can create a deck, add flashcards, and review them', async () => {
  const { user, token } = await setupAuthenticatedSession()
  const deck = await createTestDeck(user)
  const cards = await createFlashcards(deck, 5)
  
  // Add cards to deck
  const addResponse = await request(app)
    .put(`/api/flashcards`)
    .set('Authorization', `Bearer ${token}`)
    .send(cards)
    
  // Start review session
  const reviewResponse = await request(app)
    .get(`/api/flashcards/review`)
    .set('Authorization', `Bearer ${token}`)
    
  expect(reviewResponse.body.cards.length).toBe(cards.length)
})
```

## 🧪 Continuous Integration

All tests execute in the CI pipeline:

- Unit and integration tests run on every push and pull request
- Code coverage thresholds enforced: 90% for new features, 80% for legacy code
- E2E tests run on deploy environments
- Failed tests block deployments until fixed

## 🔄 Maintenance Practices

### Updating Tests
When making breaking changes:
1. Update implementation code
2. Run test suite to identify broken tests
3. Update tests to reflect new behavior
4. Validate functionality manually after fixing
5. Refactor tests for clarity alongside implementation

### Removing Dead Code
- Tests for features removed in the codebase should be removed
- Consult with team before removing tests to confirm feature is truly gone
- Maintain a short history of recently removed test files in `archive/tests/`

### Performance
- Keep test execution under reasonable time limits (individual test suites < 5 minutes)
- Use mock data or in-memory databases where appropriate
- Parallelize tests when possible using test runners' built-in capabilities
- Clean up resources after each test (files, timers, intervals)

--- 

This testing strategy ensures we deliver confidently to users with maintained code quality and helps us maintain the fast pace of feature development without sacrificing correctness or reliability.
