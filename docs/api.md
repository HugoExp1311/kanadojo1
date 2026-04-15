# API Documentation

This document provides comprehensive documentation for the Kana Dojo backend API endpoints, data structures, and integration patterns for frontend developers and external service integrations.

## 🌐 Base URL & Authentication

### Production
- Base URL: `https://api.kanadojo.com/api`
- Protocol: HTTPS only

### Development  
- Base URL: `http://localhost:4000/api`
- Protocol: HTTP (will redirect to HTTPS in production)

All endpoints that modify data or access user-specific information require authentication via JWT token in the header:

```
Authorization: Bearer {jwt-token}
```

Token is obtained during authentication at `POST /auth/login`.

## 📲 Endpoint Categories

- [Authentication](#authentication)
- [User Profile](#user-profile)
- [Flashcards](#flashcards)
- [Decks](#decks)
- [Reading Materials](#reading-materials)
- [Statistics](#statistics)
- [Dictionary](#dictionary)
- [File Uploads](#file-uploads)

---

## Authentication

### POST `/auth/signup`

Register a new user account.

#### Headers
```
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "User Name"
}
```

#### Responses
- `201 Created`: Account created successfully  
- `400 Bad Request`: Validation error in provided data
- `409 Conflict`: Email already registered

#### Success Response (201)
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "User Name",
    "createdAt": "2023-08-01T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST `/auth/login`

Authenticates a user and issues a JWT token.

#### Headers
```
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Responses
- `200 OK`: Successfully authenticated
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limited

#### Success Response (200)
```json
{
  "success": true,
  "message": "Successfully logged in",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "User Name"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST `/auth/logout`

Invalidates the current user session.

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Responses
- `200 OK`: Successfully logged out

#### Success Response (200)
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

### GET `/auth/profile`

Returns current user profile data.

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Responses
- `200 OK`: Success
- `401 Unauthorized`: Invalid or expired token

#### Success Response (200)
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "User Name",
    "preferences": {
      "learningLanguage": "ja",
      "nativeLanguage": "en",
      "dailyGoal": 10
    }
  }
}
```

---

## User Profile

### PUT `/auth/profile`

Updates the authenticated user's profile information.

#### Headers
```
Content-Type: application/json
Authorization: Bearer {jwt-token}
```

#### Request Body
```json
{
  "displayName": "Updated Name",
  "preferences": {
    "learningLanguage": "ja",
    "dailyGoal": 20
  }
}
```

#### Responses
- `200 OK`: Profile updated successfully
- `401 Unauthorized`: Invalid token

---

## Flashcards

### GET `/flashcards/dashboard`

Retrieve dashboard data including statistics, latest decks, and due cards.

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Responses
- `200 OK`: Dashboard data
- `401 Unauthorized`: Invalid token

#### Success Response (200)
```json
{
  "data": {
    "totalCards": 150,
    "dueCards": 23,
    "newCards": 5,
    "retentionRate": 86.3,
    "weeklyReviews": {
      "Mon": 12,
      "Tue": 8,
      "Wed": 15,
      "Thu": 10,
      "Fri": 7,
      "Sat": 5,
      "Sun": 0
    } 
  }
}
```

### GET `/flashcards/:id/data`

Retrieve flashcard data. Returns two data entries with the same ID: one of `"type": "jp"` and one of `"type": "en"` for the same concept.

#### Parameters
- `id`: Flashcard ID

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Responses
- `200 OK`: Flashcard data
- `404 Not Found`: Card not found
- `401 Unauthorized`: Invalid token

#### Success Response (200)
```json
[
  {
    "id": 123,
    "type": "jp",
    "vocab": "勉強",
    "reading": "べんきょう",
    "example": "毎日勉強しています。",
    "example_reading": "まいにちべんきょうしています。"
  },
  {
    "id": 123,
    "type": "en",
    "reading": "study, learning, scholarship"
  }
]
```

### POST `/flashcards/:id/review`

Submit a review after answering a flashcard to update SRS state.

#### Headers
```
Content-Type: application/json
Authorization: Bearer {jwt-token}
```

#### Parameters
- `id`: Flashcard ID

#### Request Body
```json
{
  "easeFactor": 2.5,       // Rating of difficulty (1.3-3.0)
  "difficulty": 0.3,       // Subjective difficulty rating (0-1) 
  "responseTime": 3850     // Response time in milliseconds
}
```

#### Responses
- `200 OK`: Success
- `401 Unauthorized`: Invalid token

#### Success Response (200)
```json
{
  "success": true,
  "message": "Review recorded",
  "nextReviewDate": "2023-08-05T14:30:00Z"
}
```

### GET `/flashcards/review`

Get cards due for review based on SRS algorithm, with custom query parameters.

#### Headers  
```
Authorization: Bearer {jwt-token}
```

#### Query Parameters
- `limit` (optional): Max number of cards to return (default: 10, max: 50)
- `deckId` (optional): Filter by specific deck

#### Responses
- `200 OK`: Array of due flashcards  
- `401 Unauthorized`: Invalid token

#### Success Response (200)
```json
[
  {
    "id": 123,
    "deckId": 5,
    "createdAt": "2023-07-01T12:00:00Z",
    "nextReviewDate": "2023-08-01T12:00:00Z",
    "interval": 3,
    "easeFactor": 2.6,
    "reps": 4,
    "lapses": 0
  }
]
```

### PUT `/flashcards/cards/import`

Bulk import flashcards from JSON data structure.

#### Headers
```
Content-Type: application/json
Authorization: Bearer {jwt-token}
```

#### Request Body
> [!WARNING]
> Critical structural requirement: Expected array alternating `type: "en"` and `type: "jp"` objects sharing identical `id` integer values as generated by n8n pipeline.

```json
[
  {
    "id": 1,
    "type": "en", 
    "vocab": "apple",
    "reading": "A round fruit that grows on trees",
    "example": "",
    "example_reading": ""
  },
  {
    "id": 1,
    "type": "jp",
    "vocab": "りんご",
    "reading": "ringo", 
    "example": "彼はりんごが好きです。",
    "example_reading": "かれなりんごすきです。"
  },
  {
    "id": 2,
    "type": "en",
    "vocab": "book", 
    "reading": "Written or printed work consisting of pages"
  },
  {
    "id": 2, 
    "type": "jp",
    "vocab": "本",
    "reading": "hon",
    "example": "図書館に本があります。",
    "example_reading": "としょかんほんあります。"
  }
]
```

#### Responses
- `200 OK`: Successful import
- `207 Multi-Status`: Partial success with mixed results
- `400 Bad Request`: Invalid format or data errors
- `401 Unauthorized`: Invalid token

#### Success Response (200)
```json
{
  "success": true,
  "message": "Cards imported successfully",
  "createdCount": 50,
  "updatedCount": 5
}
```

---

## Decks

### GET `/decks`

Retrieve all decks authorized to current user.

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Responses
- `200 OK`: List of decks
- `401 Unauthorized`: Invalid token

#### Success Response (200)
```json
[
  {
    "id": 12,
    "name": "N5 Vocabulary",
    "description": "Basic Japanese vocabulary for N5 level",
    "level": "N5",
    "totalCards": 250,
    "userId": 1,
    "isPublic": true,
    "createdAt": "2023-07-15T09:00:00Z"
  },
  {
    "id": 15,
    "name": "My Custom Deck",
    "description": "Words I'm struggling with",
    "level": "N4",
    "totalCards": 45,
    "userId": 1,
    "isPublic": false,
    "createdAt": "2023-08-01T14:30:00Z"
  }
]
```

### GET `/decks/:id`

Get specific deck information with brief stats.

#### Parameters
- `id`: Deck ID

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Responses
- `200 OK`: Deck data
- `404 Not Found`: Deck not found
- `401 Unauthorized`: Invalid or unauthorized token

#### Success Response (200)
```json
{
  "data": {
    "id": 1,
    "name": "N5 Core Vocabulary",
    "description": "Foundational vocabulary for N5-level learners",
    "level": "N5",
    "userId": null,  // null for shared/public decks
    "isPublic": true,
    "totalCards": 100,
    "dueCount": 12,
    "createdAt": "2023-06-10T11:00:00Z",
    "updatedAt": "2023-08-01T08:15:00Z"
  }
}
```

### POST `/decks/create`

Create a new custom deck for the authenticated user.

#### Headers
```
Content-Type: application/json
Authorization: Bearer {jwt-token}
```

#### Request Body
```json
{
  "name": "Kanji Radicals",
  "description": "Radical identification practice",
  "level": "N3",
  "isPublic": false
}
```

#### Responses
- `201 Created`: Deck created successfully
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid token

#### Success Response (201)
```json
{
  "success": true,
  "message": "Deck created successfully",
  "deck": {
    "id": 25,
    "name": "Kanji Radicals", 
    "description": "Radical identification practice",
    "level": "N3",
    "userId": 1,
    "isPublic": false,
    "createdAt": "2023-08-01T14:45:00Z"
  }
}
```

### PUT `/decks/:id`

Update deck metadata.

#### Headers
```
Content-Type: application/json
Authorization: Bearer {jwt-token}
```

#### Parameters
- `id`: Existing deck ID that belongs to user

#### Request Body
```json
{
  "name": "Updated Deck Name",
  "description": "Updated description",
  "level": "N2"
}
```

#### Responses
- `200 OK`: Deck updated successfully
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Deck not found

### DELETE `/decks/:id`

Remove a deck created by the user.

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Parameters
- `id`: Deck ID that belongs to user

#### Responses
- `200 OK`: Deck successfully deleted  
- `401 Unauthorized`: Invalid token or no permissions
- `404 Not Found`: Deck doesn't exist

---

## Reading Materials

### GET `/readings/:id`

Fetch a specific reading passage by ID.

#### Parameters
- `id`: Reading Passage ID

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Responses
- `200 OK`: Reading passage found
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Reading not found

#### Success Response (200)
```json
{
  "data": {
    "id": 45,
    "userId": 1,    // Owner/creator of this reading
    "title": "The Four Seasons in Japan",
    "content": "In Japan there are clearly...",
    "level": "JLPT5",
    "createdAt": "2023-07-20T12:00:00Z"
  }
}
```

### GET `/readings/deck/:deckId`

Get all reading passages associated with a user's deck.

#### Parameters
- `deckId`: Deck ID

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Responses
- `200 OK`: Array of readings associated with deck
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Deck doesn't exist or not accessible

#### Success Response (200) 
```json
[
  {
    "id": 12,
    "deckId": 5,
    "title": "A Day in Tokyo",
    "level": "N4",
    "difficulty": "elementary",
    "theme": "travel", 
    "createdAt": "2023-07-18T10:00:00Z"
  }
]
```

### POST `/readings/generate`

Request generation of new reading passage based on deck and parameters.

#### Headers
```
Content-Type: application/json
Authorization: Bearer {jwt-token}
```

#### Request Body
```json
{
  "deckId": 15,
  "topic": "technology", 
  "level": "N3",
  "length": "medium",
  "includeVocabulary": false
}
```

#### Responses
- `202 Accepted`: Generation request accepted, process running
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Deck not found    
- `429 Too Many Requests`: Rate limit reached

#### Success Response (202)
```json
{
  "success": true,
  "message": "Reading generation initiated",
  "requestId": "gen_a1b2c3d4-e5f6-7890-1234-567890abcdef"
}
```

### GET `/readings/status/:requestId`

Check status of reading generation request.

#### Parameters
- `requestId`: ID returned from POST `/generate`

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Responses
- `200 OK`: Status information
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Request ID not found

#### Success Response Examples:

```json
// Case 1: Still processing
{
  "status": "processing",
  "progress": 65,
  "message": "AI generating reading passage based on your deck vocabulary..."
}
```

```json
// Case 2: Completed
{
  "status": "completed",  
  "readingId": 34,
  "title": "Technology in Daily Life",
  "message": "Generation completed successfully"
}
```

```json
// Case 3: Failed
{
  "status": "failed",
  "error": "Vocabulary too complex for specified level",
  "message": "Reading generation failed - please update deck or change level"
}
```

---

## Statistics

### POST `/stats/session-complete`  

Record flashcard learning session data (score, duration, etc).

#### Headers
```
Content-Type: application/json
Authorization: Bearer {jwt-token}
```

#### Request Body
```json
{
  "sessionId": "7890",
  "mode": "pick", // "pick", "type", or "yomi"
  "deckId": 12,
  "cardsReviewedCount": 15,
  "cardsCorrectCount": 12,
  "sessionDurationSecs": 180,
  "score": 80
}
```

#### Responses
- `200 OK`: Stats recorded successfully
- `401 Unauthorized`: Invalid token

---

## Dictionary

### GET `/dictionary/search`

Search the integrated dictionary by term or wildcard.

#### Query Parameters  
- `term`: Term to search for
- `exact` (optional): Boolean for exact match (default: false)

#### Example
`GET /dictionary/search?term=bento`

#### Responses
- `200 OK`: Search results
- `400 Bad Request`: Missing search term

#### Success Response (200)
```json
{
  "results": [
    {
      "id": 1,
      "character": "弁当",
      "kana": ["べんとう"],
      "meanings": [
        {
          "definition": "boxed lunch; packed meal;",
          "parts_of_speech": ["noun"],
          "tags": ["common"]
        }
      ],      
      "jlpt_level": 3
    }
  ]
}
```

---

## File Uploads

### POST `/upload`

Upload a PDF file for processing into flashcards (part of the PDF→flashcard pipeline).

#### FormData
- `file`: PDF file to be processed
- `deckId`: Associated deck ID (optional for assigning cards to a deck later)

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Responses
- `200 OK`: File accepted and processing
- `400 Bad Request`: Invalid file type or size
- `401 Unauthorized`: Invalid token

#### Success Response (200)
```json  
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "File received. Processing initiated.",
  "fileName": "japanese-verbs.pdf",
  "statusUrl": "/api/upload/status/550e8400-e29b-41d4-a716-446655440000"
}
```

### GET `/upload/status/:sessionId`

Check processing status of uploaded file (used by PDF pipeline).

#### Parameters
- `sessionId`: ID returned from original upload

#### Headers
```
Authorization: Bearer {jwt-token}
```

#### Responses
- `200 OK`: Processing status
- `401 Unauthorized`: Invalid token
- `404 Not Found`: Session ID not found

#### Success Response (200)
```json
{
  "status": "processing",  // 'processing', 'completed', 'failed'
  "progress": 80,
  "message": "Parsing vocabulary from PDF",
  "cardsGenerated": 0,
  "estimatedCompletionTime": "2023-08-01T13:25:00Z"
}
```

---

## Error Handling

### API Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Field 'email' is required and must be valid"  
  }
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource successfully created  
- `202 Accepted`: Request accepted but processing continues asynchronously
- `400 Bad Request`: Client sent invalid data or malformed request
- `401 Unauthorized`: Authentication required or invalid token
- `404 Not Found`: Resource doesn't exist or isn't accessible
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error occurred

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

- Generic requests: 100 requests per hour per IP/user
- Authentication related: 20 resets per hour (to prevent credential attacks)
- File uploads: 5 per hour per user (to prevent spamming)
- API keys or higher tier accounts may have elevated limits

Rate limited requests return HTTP `429 Too Many Requests` with:

```json
{
  "success": false,
  "error": {
    "type": "RateLimitedError",
    "message": "Too many requests. Try again in 60 minutes"
  }
}
```

---

This API documentation serves as the authoritative reference for integrations with the Kana Dojo platform. All endpoints are subject to change in newer versions, and proper versioning implementation will be established in future releases.
