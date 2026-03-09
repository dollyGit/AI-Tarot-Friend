# Three-Layer Memory Architecture — Detailed Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Memory Layer Architecture                     │
│                                                                 │
│  Layer 1: Working Memory (Redis)                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ TTL: 30min sliding │ Scope: Current session              │   │
│  │ • Last N conversation turns                              │   │
│  │ • Extracted entities (people, topics, emotions)          │   │
│  │ • Current sentiment score                                │   │
│  │ • Topic stack (what we're discussing now)                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │ session ends                         │
│                          ▼                                      │
│  Layer 2: Session Summary (Qdrant — conversation_summaries)     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Retention: Permanent │ Scope: One session                │   │
│  │ • Compressed summary of conversation                     │   │
│  │ • Embedded as 1536-dim vector                            │   │
│  │ • Metadata: sentiment, people, topics, emotions, cards   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │ every 3-5 sessions                   │
│                          ▼                                      │
│  Layer 3: Long-Term Memory (Qdrant — long_term_memory)          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Retention: Permanent with decay │ Scope: Cross-session   │   │
│  │ • Aggregated life patterns and recurring themes          │   │
│  │ • Importance score with time decay                       │   │
│  │ • Life area classification                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Working Memory — Implementation

### Redis Data Structure

```typescript
interface WorkingMemory {
  session_id: string;
  customer_id: string;

  // Conversation turns (sliding window)
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    sentiment_score?: number;
  }>;

  // Real-time entity extraction
  extracted_entities: {
    people: string[];          // ["母親", "男朋友小陳"]
    topics: string[];          // ["career", "family"]
    emotions: string[];        // ["焦慮", "期待"]
    locations: string[];       // ["台北", "公司"]
    time_refs: string[];       // ["上週", "明天"]
  };

  // Session-level aggregates
  current_sentiment: number;   // -1 to 1
  topic_stack: string[];       // Current focus topics (LIFO)
  turn_count: number;
  cards_drawn: Array<{
    name: string;
    position: number;
    orientation: string;
  }>;
}
```

### Operations

```typescript
// Write after each user message
async function updateWorkingMemory(sessionId: string, message: UserMessage): Promise<void> {
  const key = `conversation:working:${sessionId}`;
  const current = await redis.get(key);
  const memory: WorkingMemory = current ? JSON.parse(current) : initializeWorking(sessionId);

  // Append message (keep last 20 turns max)
  memory.messages.push({
    role: 'user',
    content: message.text,
    timestamp: new Date().toISOString(),
    sentiment_score: message.sentiment?.score
  });
  if (memory.messages.length > 20) {
    memory.messages = memory.messages.slice(-20);
  }

  // Extract entities from new message
  const entities = await extractEntities(message.text);
  memory.extracted_entities.people = dedupe([
    ...memory.extracted_entities.people,
    ...entities.people
  ]);
  memory.extracted_entities.topics = dedupe([
    ...memory.extracted_entities.topics,
    ...entities.topics
  ]);

  // Update sentiment
  memory.current_sentiment = message.sentiment?.score ?? memory.current_sentiment;
  memory.turn_count++;

  // Save with sliding TTL (30 minutes)
  await redis.setex(key, 1800, JSON.stringify(memory));
}

// Read before AI response generation
async function getWorkingMemory(sessionId: string): Promise<WorkingMemory | null> {
  const key = `conversation:working:${sessionId}`;
  const data = await redis.get(key);
  if (data) {
    // Reset TTL on access (sliding window)
    await redis.expire(key, 1800);
    return JSON.parse(data);
  }
  return null;
}

// Clear on session end
async function clearWorkingMemory(sessionId: string): Promise<void> {
  await redis.del(`conversation:working:${sessionId}`);
}
```

---

## Layer 2: Session Summary — Implementation

### Summarization Pipeline

```typescript
async function createSessionSummary(
  sessionId: string,
  customerId: string,
  workingMemory: WorkingMemory
): Promise<void> {
  // Step 1: Generate summary using LLM
  const summaryText = await llm.summarize({
    messages: workingMemory.messages,
    maxTokens: 200,
    prompt: `Summarize this tarot reading conversation in 2-3 sentences.
             Focus on: user's concerns, cards drawn, key insights given.
             Language: Match the user's language.`
  });

  // Step 2: Generate embedding
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: summaryText
  });

  // Step 3: Compute metadata
  const sentiment = computeSessionSentiment(workingMemory.messages);
  const keyTopics = extractDominantTopics(workingMemory.extracted_entities.topics);
  const keyPeople = workingMemory.extracted_entities.people;
  const emotionTags = workingMemory.extracted_entities.emotions;

  // Step 4: Upsert to Qdrant
  await qdrant.upsert('conversation_summaries', {
    points: [{
      id: sessionId,  // Use session ID as point ID
      vector: embedding.data[0].embedding,
      payload: {
        customer_id: customerId,
        session_id: sessionId,
        summary_text: summaryText,
        sentiment_label: sentiment.label,
        sentiment_score: sentiment.score,
        key_topics: keyTopics,
        key_people: keyPeople,
        emotion_tags: emotionTags,
        cards_drawn: workingMemory.cards_drawn.map(c =>
          `${c.name} (${c.orientation})`
        ),
        spread_type: workingMemory.cards_drawn.length > 0
          ? inferSpreadType(workingMemory.cards_drawn.length)
          : null,
        created_at: new Date().toISOString()
      }
    }]
  });
}
```

### Retrieval for New Session

```typescript
async function retrieveRelevantSummaries(
  customerId: string,
  currentContext: string,
  limit: number = 5
): Promise<SessionSummary[]> {
  // Embed current context
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: currentContext
  });

  // Search with customer filter
  const results = await qdrant.search('conversation_summaries', {
    vector: queryEmbedding.data[0].embedding,
    filter: {
      must: [{ key: 'customer_id', match: { value: customerId } }]
    },
    limit,
    score_threshold: 0.72,
    with_payload: true
  });

  // Apply recency boost (more recent = higher score)
  return results.map(r => ({
    ...r.payload,
    final_score: r.score * recencyBoost(r.payload.created_at)
  })).sort((a, b) => b.final_score - a.final_score);
}

function recencyBoost(createdAt: string): number {
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 86400);
  return 1.0 / (1.0 + daysSince / 60);  // Half-life of ~60 days
}
```

---

## Layer 3: Long-Term Memory — Implementation

### Aggregation Pipeline

```typescript
async function aggregateLongTermMemory(customerId: string): Promise<void> {
  // Step 1: Get recent summaries not yet aggregated
  const recentSummaries = await qdrant.scroll('conversation_summaries', {
    filter: {
      must: [
        { key: 'customer_id', match: { value: customerId } },
        // Only process summaries from the last aggregation
      ]
    },
    limit: 20,
    with_payload: true
  });

  // Step 2: Cluster by life_area using topic analysis
  const clusters = clusterByLifeArea(recentSummaries);

  // Step 3: For each cluster, generate or update long-term memory
  for (const [lifeArea, summaries] of Object.entries(clusters)) {
    const memoryText = await llm.aggregate({
      summaries: summaries.map(s => s.summary_text),
      prompt: `Synthesize these conversation summaries into a single insight about
               the user's ${lifeArea} life area. Be concise (1-2 sentences).
               Focus on recurring patterns, not individual events.`
    });

    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: memoryText
    });

    // Check if similar memory already exists
    const existing = await qdrant.search('long_term_memory', {
      vector: embedding.data[0].embedding,
      filter: {
        must: [
          { key: 'customer_id', match: { value: customerId } },
          { key: 'life_area', match: { value: lifeArea } }
        ]
      },
      limit: 1,
      score_threshold: 0.85
    });

    if (existing.length > 0) {
      // Update existing memory (merge)
      await qdrant.setPayload('long_term_memory', {
        points: [existing[0].id],
        payload: {
          memory_text: memoryText,
          importance_score: Math.min(1.0, existing[0].payload.importance_score + 0.05),
          source_sessions: [...existing[0].payload.source_sessions, ...summaries.map(s => s.session_id)],
          last_accessed: new Date().toISOString()
        }
      });
      // Update vector too
      await qdrant.updateVectors('long_term_memory', {
        points: [{
          id: existing[0].id,
          vector: embedding.data[0].embedding
        }]
      });
    } else {
      // Create new long-term memory
      await qdrant.upsert('long_term_memory', {
        points: [{
          id: generateUUID(),
          vector: embedding.data[0].embedding,
          payload: {
            customer_id: customerId,
            memory_text: memoryText,
            life_area: lifeArea,
            scope: summaries.length >= 3 ? 'recurring_theme' : 'single_event',
            importance_score: 0.5 + (summaries.length * 0.05),
            source_sessions: summaries.map(s => s.session_id),
            last_accessed: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
        }]
      });
    }
  }
}
```

### Importance Decay

```typescript
// Run daily as a scheduled job
async function decayMemoryImportance(): Promise<void> {
  const allMemories = await qdrant.scroll('long_term_memory', {
    limit: 1000,
    with_payload: true
  });

  const now = Date.now();
  const updates = allMemories
    .filter(m => {
      const daysSinceAccess = (now - new Date(m.payload.last_accessed).getTime()) / (1000 * 86400);
      return daysSinceAccess > 7;  // Only decay if not accessed in 7+ days
    })
    .map(m => {
      const daysSinceAccess = (now - new Date(m.payload.last_accessed).getTime()) / (1000 * 86400);
      const decayFactor = Math.exp(-daysSinceAccess / 90);  // 90-day half-life
      const newImportance = Math.max(0.1, m.payload.importance_score * decayFactor);

      return {
        id: m.id,
        payload: { importance_score: newImportance }
      };
    });

  // Batch update
  for (const update of updates) {
    await qdrant.setPayload('long_term_memory', {
      points: [update.id],
      payload: update.payload
    });
  }

  // Prune memories with importance < 0.15
  const toDelete = allMemories
    .filter(m => m.payload.importance_score < 0.15)
    .map(m => m.id);

  if (toDelete.length > 0) {
    await qdrant.delete('long_term_memory', { points: toDelete });
  }
}
```

---

## Life Area Classification

```typescript
const LIFE_AREA_KEYWORDS: Record<string, string[]> = {
  family: ['母親', '父親', '家人', '老公', '老婆', '小孩', '兄弟', '姊妹', 'family', 'parent', 'mother', 'father'],
  career: ['工作', '老闆', '同事', '升遷', '面試', '離職', 'career', 'job', 'work', 'boss', 'promotion'],
  romance: ['感情', '男朋友', '女朋友', '暗戀', '分手', '結婚', 'love', 'relationship', 'partner', 'dating'],
  health: ['健康', '生病', '醫院', '壓力', '失眠', '身體', 'health', 'illness', 'hospital', 'stress'],
  finance: ['錢', '投資', '理財', '負債', '薪水', '買房', 'money', 'investment', 'debt', 'salary'],
  spiritual: ['靈性', '修行', '冥想', '命運', '前世', '因果', 'spiritual', 'meditation', 'destiny', 'karma']
};

function classifyLifeArea(topics: string[], people: string[]): string {
  const scores: Record<string, number> = {};

  for (const [area, keywords] of Object.entries(LIFE_AREA_KEYWORDS)) {
    scores[area] = 0;
    for (const topic of [...topics, ...people]) {
      if (keywords.some(kw => topic.toLowerCase().includes(kw.toLowerCase()))) {
        scores[area]++;
      }
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'general';
}
```
