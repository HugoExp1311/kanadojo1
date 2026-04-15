# Component Deep Dive

This document provides detailed explanations of key components in the Kana Dojo application, their responsibilities, API contracts (props, events), and relationships with other parts of the codebase.

## 🏗️ Component Architecture Overview

Components are organized following a feature-based architecture within the `frontend/features/` directory:

```
frontend/
├── features/
│   ├── Flashcards/     # Flashcard-related functionality
│   ├── Dictionary/     # Dictionary search and integration
│   ├── Games/          # Game modes (Pick, Type, Yomi)
│   └── KanjiStudy/     # Radicals andmnemonics
│── shared/             # Shared components available project-wide
│   ├── components/     # Reusable UI widgets  
│   ├── hooks/          # Shared React hooks
│   └── utils/          # Shared utility functions
└── app/                # Next.js pages and routing
```

## 🃏 Flashcard Components

### FlashcardReadingView.tsx

Located in `frontend/features/Flashcards/components/FlashcardReadingView.tsx`, this component displays flashcards allowing users to engage with reading passages and grammar hints.

#### Responsibilities
- Render flashcard content based on JP/EN data pairs
- Handle flip animations between question and answer  
- Show grammar hints with pop-up explanations
- Track user interactions and submit review data
- Handle the dual nature of flashcards (JP + EN sides)

#### Props Interface
```typescript
interface FlashcardReadingViewProps {
  card: RawDataEntry[];          // Two entries: 'jp' and 'en' sides
  onReview?: (rating: number) => void; // Callback for review completion
  mode?: 'review' | 'learn';    // Control review-specific behavior
  autoFocus?: boolean;          // Focus card on mount for accessibility
}
```

#### Key Behaviors
- Uses framer-motion for flip animations
- Manages state for showing/hiding grammar hints  
- Prevents overlapping hint popups - closes when clicking elsewhere
- Bubbles up review events to parent component

#### Integration Points
- Interacts directly with `zustand` flashcard store for session tracking
- Communicates with backend via `/flashcards/:id/review` endpoint
- May activate Kanji explanation drawer based on game context

> [!WARNING]
> Critical state management: The `showHints` state management prevents multiple grammar hints from appearing simultaneously, which would create confusing UI overlap. Clicking outside a hint closes all hints.

### HintsViewCard.tsx

This component displays contextual grammar or vocabulary hints as pop-ups when activated by the user in flashcard view.

#### Responsibilities
- Present grammatical structure information
- Display example sentences and usage notes  
- Support rich text formatting for linguistic notations
- Handle rendering outside normal document flow (DOM teleportation/portal)

#### Props Interface
```typescript
interface HintsViewCardProps {
  grammarList: GrammarItem[];    // List of grammar structures to explain
  position?: { left: number; top: number; }; // Absolute positioning override
  visible?: boolean;            // Toggle visibility
  onClose?: () => void;         // Dismissal callback
}
```

#### Integration Points
- Often triggered by user interaction in `FlashcardReadingView`
- Uses overlay UI library or portal solution for proper z-index stacking

## 🎮 Game Components

### FlashcardGame.tsx

The orchestrator for flashcard-based study sessions that can contain Pick, Type, or Yomi game modes.

#### Responsibilities
- Select and present appropriate game mode
- Maintain session scoring and progress  
- Coordinate card transitions between modes
- Bubble up active word transitions via `onActiveWordChange`

#### Props Interface
```typescript
interface FlashcardGameProps {
  deckId: number;
  mode: 'pick' | 'type' | 'yomi';
  onActiveWordChange?: (word: string, type: string) => void; // For Kanji drawer updates
  onComplete?: (results: GameResults) => void;
}
```

#### Key Behaviors  
- Controls session lifecycle and card selection algorithm
- Maintains scoring and statistics across cards
- Provides consistent UI framework regardless of game mode

> [!IMPORTANT]
> The `onActiveWordChange` prop is essential for maintaining coordination between the active game component and the `KanjiExplanationDrawer` to ensure relevant Kanji information updates as users progress through flashcards.

### Game Mode Components (Pick, Type, Yomi)

These sibling components located in `frontend/features/Games/components/` implement specific game mechanics:

- **Pick.tsx**: Multiple choice selection among several options
- **Type.tsx**: Typing challenges with Japanese input  
- **Yomi.tsx**: Japanese pronunciation-focused exercises with potential katakana conversion

Each shares core behaviors like score tracking and session progression, but differs in user interaction patterns and validation logic.

#### Shared Pattern Interface
```typescript
interface GameModeComponentProps {
  card: RawDataEntry;
  onNext: (result: RoundResult) => void;  // Report result to parent for scoring
  settings: GameSettings;   // Personalized difficulty/confidentiality
  autoFocus?: boolean;     // Accessibility consideration
}
```

## 🔍 Dictionary Components

### DictionarySearch.tsx

Main component that allows full-text searching of the integrated dictionary service with live autocomplete.

#### Responsibilities
- Handle complex full-text search queries against dictionary API  
- Provide live search suggestions via autocomplete UI
- Display detailed word information
- Integrate Add To Flashcard workflows

#### Props Interface
```typescript
interface DictionarySearchProps {
  autoFocus?: boolean;        // Focus search on component mount
  onSelect?: (result: SearchResult) => void; // Callback when user selects a term
  addToDeckId?: number;       // Pre-select this deck in any add-to options
  compactUI?: boolean;        // Minimized presentation variant  
}
```

#### Key Features
- Utilizes FuzzySearch hook for client-side search performance
- Makes efficient use of /data-wanikani/vocab-list.json for suggestions
- Integrates with flashcard system and stores vocabulary additions  

## 🙋 Components

### KanjiExplanationDrawer

Sliding right-edge drawer component that shows detailed information about selected Kanji in context.

#### Responsibilities
- Presents comprehensive radical breakdowns and etymology
- Integrates both AI-generated and WaniKani-sourced information  
- Provides stroke order animations (tbd)

> [!TIP]
> The drawer was designed as a sliding component rather than a modal to preserve flashcard focus during study. Users can quickly reference Kanji data without losing their place in the study context.

#### Integration Points
- Receives updates of active word via `onActiveWordChange` callback from game components
- Tightly coupled with WaniKani static data API at `/data-wanikani/kanji/[char].json`
- May present AI-generated explanations from deprecated mnemonics (though still preserved in DB)

---

## 💾 State Management Components

### Zustand Hook Integration

Global store components include:

- `useFlashcardStore()` - Manages current review session state
- `useStatsStore()` - Tracks learning metrics and statistics across sessions

#### Usage Pattern
Components access these through React context, allowing:
- Consistent session tracking between sessions
- Shared statistics updates across multiple UI components
- Decoupled data persistence that can survive component unmounts

#### Critical Implementation Notes
- Store hydration timing can conflict with component mount timing  
- Late-hydration useEffect hooks ensure consistent initial card selection after store bootstrapping
- Both stores use localStorage persistence combined with server-sync patterns

---

## 🎛️ Shared Components

Several components in `frontend/shared/components/` provide consistent UI elements:

- **Modal.tsx** - Accessible modal dialogs with proper focus trapping
- **Button.tsx** - Consistent styling and behavior across all buttons
- **Loader.tsx** - Visual feedback for asynchronous operations
- **Badge.tsx** - Status indicators and achievement markers

These are styled using Tailwind CSS utility framework to maintain consistency without traditional CSS files.

---

## 🔌 Integration Contracts

### API Communication Components

Several components contain direct communication logic:

- **Flashcard components** connect to both data fetching (`/api/flashcards/:id/data`) and review submission (`/api/flashcards/:id/review`)
- **Dictionary components** call search endpoint (`/api/dictionary/search`) and static Wanikani data files  
- **Upload components** interface with PDF processing (`/api/upload` + `/api/upload/status`)

### Data Format Requirements

Components have tight couplings to API format expectations documented in HANDOVER_V2:

- The flashcard dual-format expectation (JP+EN with identical ids) is fundamental to `FlashcardReadingView`
- Reading JSON contract governs rendering in reading-focused components
- Grammar list structure requirements impact `GrammarHint` components

---

Understanding these component relationships is critical for maintaining the delicate balance between modularity and inter-connectedness required for this language learning system. The architecture specifically balances shared functionality with specific feature needs, particularly important given the varied approaches needed between different aspects of Japanese study (vocabulary, reading, Kanji recognition).
