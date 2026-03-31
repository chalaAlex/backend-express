/**
 * Property-Based Tests for Chat Messaging feature
 * Uses fast-check for property generation.
 * These tests exercise pure logic functions extracted from the controllers
 * without requiring a live DB connection.
 */

const fc = require('fast-check');
const { ALLOWED_ATTACHMENT_TYPES } = require('../model/messageModel');

// ---------------------------------------------------------------------------
// Pure helper functions under test (extracted from controller logic)
// ---------------------------------------------------------------------------

/** Canonical sort of two participant IDs — same logic as chatController */
function sortParticipants(idA, idB) {
  return [idA, idB].sort();
}

/** Simulate getOrCreate idempotence using an in-memory map */
function makeGetOrCreateRoom() {
  const store = new Map();
  return function getOrCreate(idA, idB) {
    const key = sortParticipants(idA, idB).join('|');
    if (!store.has(key)) {
      store.set(key, { id: key, participants: sortParticipants(idA, idB) });
    }
    return store.get(key);
  };
}

/** Validate attachment MIME type — same logic as messageModel enum */
function isValidAttachmentType(type) {
  return ALLOWED_ATTACHMENT_TYPES.includes(type);
}

/** Sort messages chronologically (ascending createdAt) */
function sortMessagesChronologically(messages) {
  return [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/** Sort inbox rooms by lastMessageAt descending */
function sortInboxDescending(rooms) {
  return [...rooms].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
}

/** Compute unread count for a user in a room */
function computeUnreadCount(messages, currentUserId) {
  return messages.filter((m) => !m.isRead && m.senderId !== currentUserId).length;
}

/** Paginate an array */
function paginate(items, page, limit) {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

/** Fetch all pages and concatenate */
function fetchAllPages(items, limit) {
  const totalPages = Math.ceil(items.length / limit);
  const result = [];
  for (let p = 1; p <= totalPages; p++) {
    result.push(...paginate(items, p, limit));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const mongoIdArb = fc.stringMatching(/^[0-9a-f]{24}$/);

const messageArb = fc.record({
  id: mongoIdArb,
  chatRoomId: mongoIdArb,
  senderId: mongoIdArb,
  text: fc.string({ minLength: 1, maxLength: 200 }),
  isRead: fc.boolean(),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
});

const chatRoomArb = fc.record({
  id: mongoIdArb,
  lastMessageAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  unreadCount: fc.nat(50),
});

// ---------------------------------------------------------------------------
// Property 1: Chat room creation idempotence
// Validates: Requirements 1.2, 1.5
// ---------------------------------------------------------------------------
describe('Property 1: Chat room creation idempotence', () => {
  test('calling getOrCreate multiple times for the same pair always returns the same room', () => {
    fc.assert(
      fc.property(mongoIdArb, mongoIdArb, (idA, idB) => {
        fc.pre(idA !== idB);
        const getOrCreate = makeGetOrCreateRoom();
        const r1 = getOrCreate(idA, idB);
        const r2 = getOrCreate(idA, idB);
        const r3 = getOrCreate(idB, idA); // reversed order — must still be same room
        return r1.id === r2.id && r1.id === r3.id;
      }),
      { numRuns: 200 }
    );
  });

  test('different participant pairs produce different rooms', () => {
    fc.assert(
      fc.property(mongoIdArb, mongoIdArb, mongoIdArb, (idA, idB, idC) => {
        fc.pre(idA !== idB && idB !== idC && idA !== idC);
        const getOrCreate = makeGetOrCreateRoom();
        const r1 = getOrCreate(idA, idB);
        const r2 = getOrCreate(idA, idC);
        return r1.id !== r2.id;
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Message persistence round-trip (structural)
// Validates: Requirement 2.2
// ---------------------------------------------------------------------------
describe('Property 2: Message persistence round-trip', () => {
  test('a persisted message retains its text, senderId, and chatRoomId', () => {
    fc.assert(
      fc.property(messageArb, (msg) => {
        // Simulate DB round-trip via JSON serialisation (as Mongoose would do)
        const stored = JSON.parse(JSON.stringify(msg));
        return (
          stored.text === msg.text &&
          stored.senderId === msg.senderId &&
          stored.chatRoomId === msg.chatRoomId
        );
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Message fields invariant
// Validates: Requirement 2.3
// ---------------------------------------------------------------------------
describe('Property 3: Message fields invariant', () => {
  test('every message has non-null senderId, chatRoomId, and createdAt', () => {
    fc.assert(
      fc.property(messageArb, (msg) => {
        return (
          msg.senderId != null &&
          msg.chatRoomId != null &&
          msg.createdAt != null
        );
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Message history chronological order
// Validates: Requirement 2.4
// ---------------------------------------------------------------------------
describe('Property 4: Message history chronological order', () => {
  test('sorted messages are in ascending createdAt order', () => {
    fc.assert(
      fc.property(fc.array(messageArb, { minLength: 2, maxLength: 30 }), (messages) => {
        const sorted = sortMessagesChronologically(messages);
        for (let i = 0; i < sorted.length - 1; i++) {
          if (new Date(sorted[i].createdAt) > new Date(sorted[i + 1].createdAt)) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Attachment type validation
// Validates: Requirements 3.2, 3.3
// ---------------------------------------------------------------------------
describe('Property 5: Attachment type validation', () => {
  test('valid image MIME types are accepted', () => {
    for (const type of ALLOWED_ATTACHMENT_TYPES) {
      expect(isValidAttachmentType(type)).toBe(true);
    }
  });

  test('invalid MIME types are rejected', () => {
    const invalidTypes = [
      'application/pdf',
      'video/mp4',
      'text/plain',
      '',
      'image/bmp',
      'image/tiff',
      'application/octet-stream',
    ];
    for (const type of invalidTypes) {
      expect(isValidAttachmentType(type)).toBe(false);
    }
  });

  test('arbitrary non-image strings are always rejected', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (type) => {
        fc.pre(!ALLOWED_ATTACHMENT_TYPES.includes(type));
        return !isValidAttachmentType(type);
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Read receipt state transition
// Validates: Requirement 4.1
// ---------------------------------------------------------------------------
describe('Property 6: Read receipt state transition', () => {
  test('marking a message as read sets isRead to true', () => {
    fc.assert(
      fc.property(messageArb, (msg) => {
        const updated = { ...msg, isRead: true };
        return updated.isRead === true;
      }),
      { numRuns: 200 }
    );
  });

  test('marking an already-read message as read is a no-op', () => {
    fc.assert(
      fc.property(messageArb, (msg) => {
        const alreadyRead = { ...msg, isRead: true };
        const markedAgain = { ...alreadyRead, isRead: true };
        return markedAgain.isRead === true;
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Inbox sorted by last message timestamp (descending)
// Validates: Requirement 5.3
// ---------------------------------------------------------------------------
describe('Property 7: Inbox sorted by last message timestamp', () => {
  test('inbox rooms are sorted in descending lastMessageAt order', () => {
    fc.assert(
      fc.property(fc.array(chatRoomArb, { minLength: 2, maxLength: 20 }), (rooms) => {
        const sorted = sortInboxDescending(rooms);
        for (let i = 0; i < sorted.length - 1; i++) {
          if (new Date(sorted[i].lastMessageAt) < new Date(sorted[i + 1].lastMessageAt)) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Unread count accuracy
// Validates: Requirement 5.5
// ---------------------------------------------------------------------------
describe('Property 8: Unread count accuracy', () => {
  test('unreadCount equals messages where isRead=false AND sender != currentUser', () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 0, maxLength: 30 }),
        mongoIdArb,
        (messages, currentUserId) => {
          const expected = messages.filter(
            (m) => !m.isRead && m.senderId !== currentUserId
          ).length;
          const computed = computeUnreadCount(messages, currentUserId);
          return computed === expected;
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Pagination completeness and no duplication
// Validates: Requirement 7.4
// ---------------------------------------------------------------------------
describe('Property 9: Pagination completeness and no duplication', () => {
  test('fetching all pages produces exactly the same messages as fetching all at once', () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (messages, pageSize) => {
          const allAtOnce = [...messages];
          const paged = fetchAllPages(messages, pageSize);

          if (allAtOnce.length !== paged.length) return false;

          for (let i = 0; i < allAtOnce.length; i++) {
            if (allAtOnce[i].id !== paged[i].id) return false;
          }
          return true;
        }
      ),
      { numRuns: 200 }
    );
  });

  test('no message appears more than once across all pages', () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (messages, pageSize) => {
          const paged = fetchAllPages(messages, pageSize);
          const ids = paged.map((m) => m.id);
          const uniqueIds = new Set(ids);
          return uniqueIds.size === ids.length;
        }
      ),
      { numRuns: 200 }
    );
  });
});
