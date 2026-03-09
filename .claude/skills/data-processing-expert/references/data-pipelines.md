# Data Pipelines — Entity Extraction, Summarization & Profiling

## Entity Extraction Pipeline

### Architecture

```
User message → Sentiment Analysis → Entity Extraction → Storage Routing
                    │                       │
                    ▼                       ├─→ Neo4j (Person, Event, Topic nodes)
              InfluxDB                     ├─→ Redis (working memory update)
              (sentiment score)            └─→ MongoDB (raw append)
```

### LLM-Based Entity Extraction

```typescript
const ENTITY_EXTRACTION_PROMPT = `Extract structured entities from this tarot reading conversation turn.

User message: {{message}}
Conversation context: {{context}}

Return a JSON object with these fields:
{
  "people": [{"name": "...", "relationship": "..."}],
  "events": [{"description": "...", "time_reference": "...", "life_area": "..."}],
  "topics": ["..."],
  "emotions": ["..."],
  "locations": ["..."]
}

Rules:
- For Chinese names, keep the full name (e.g., "小陳", "母親")
- Resolve pronouns to names when possible (e.g., "她" → "母親" if context is clear)
- time_reference should be relative (e.g., "上週", "yesterday", "last month")
- life_area: family/career/romance/health/finance/spiritual/general
- emotions should be in the user's language (zh-TW or en)`;

interface ExtractedEntities {
  people: Array<{ name: string; relationship?: string }>;
  events: Array<{ description: string; time_reference?: string; life_area: string }>;
  topics: string[];
  emotions: string[];
  locations: string[];
}

async function extractEntities(
  message: string,
  context: string
): Promise<ExtractedEntities> {
  try {
    const response = await llm.generate({
      model: 'gpt-4o-mini',
      maxTokens: 200,
      temperature: 0.1,
      prompt: ENTITY_EXTRACTION_PROMPT
        .replace('{{message}}', message)
        .replace('{{context}}', context)
    });

    return JSON.parse(response);
  } catch (error) {
    // Fallback: rule-based extraction
    return ruleBasedExtraction(message);
  }
}
```

### Rule-Based Fallback Extraction

```typescript
const RELATIONSHIP_PATTERNS: Record<string, string> = {
  '母親|媽媽|老媽|媽咪': 'mother',
  '父親|爸爸|老爸|爸比': 'father',
  '老公|先生|丈夫': 'husband',
  '老婆|太太|妻子': 'wife',
  '男朋友|男友|男盆友': 'boyfriend',
  '女朋友|女友|女盆友': 'girlfriend',
  '老闆|主管|上司': 'boss',
  '同事|同仁': 'colleague',
  '朋友|好友|閨蜜|兄弟': 'friend',
  '小孩|兒子|女兒|孩子': 'child',
  '兄弟|哥哥|弟弟': 'brother',
  '姊妹|姐姐|妹妹': 'sister'
};

function ruleBasedExtraction(text: string): ExtractedEntities {
  const people: Array<{ name: string; relationship: string }> = [];

  for (const [pattern, relationship] of Object.entries(RELATIONSHIP_PATTERNS)) {
    const regex = new RegExp(pattern, 'g');
    const matches = text.match(regex);
    if (matches) {
      people.push({ name: matches[0], relationship });
    }
  }

  // Topic detection
  const topicKeywords: Record<string, string[]> = {
    career: ['工作', '公司', '面試', '升遷', '離職', '薪水', '老闆'],
    family: ['家人', '母親', '父親', '家庭', '小孩'],
    romance: ['感情', '喜歡', '愛情', '分手', '約會', '曖昧'],
    health: ['身體', '健康', '生病', '壓力', '失眠'],
    finance: ['錢', '投資', '理財', '負債', '存款']
  };

  const topics: string[] = [];
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      topics.push(topic);
    }
  }

  return { people, events: [], topics, emotions: [], locations: [] };
}
```

### Coreference Resolution

```typescript
// Resolve pronouns to named entities in working memory
function resolveCorefs(
  entities: ExtractedEntities,
  workingMemory: WorkingMemory
): ExtractedEntities {
  const knownPeople = new Map(
    workingMemory.extracted_entities.people.map(p => [p, p])
  );

  // Map Chinese pronouns to most recently mentioned person
  const pronounMap: Record<string, 'female' | 'male' | 'neutral'> = {
    '她': 'female', '他': 'male', '牠': 'neutral',
    '對方': 'neutral', '那個人': 'neutral'
  };

  // Simple heuristic: most recently mentioned person of matching gender
  // (Full implementation would use a trained coref model)

  return entities;
}
```

---

## Neo4j Graph Writing Pipeline

### After Entity Extraction

```typescript
async function writeToGraph(
  customerId: string,
  sessionId: string,
  entities: ExtractedEntities
): Promise<void> {
  const session = neo4j.session();

  try {
    await session.executeWrite(async (tx) => {
      // Ensure Customer node exists
      await tx.run(`
        MERGE (c:Customer {id: $customerId})
        RETURN c
      `, { customerId });

      // Create/update Person nodes
      for (const person of entities.people) {
        await tx.run(`
          MATCH (c:Customer {id: $customerId})
          MERGE (p:Person {name: $name})
          ON CREATE SET p.relationship_to_customer = $relationship
          MERGE (c)-[k:KNOWS]->(p)
          ON CREATE SET k.strength = 0.5, k.first_mentioned = datetime(),
                        k.mention_count = 1
          ON MATCH SET k.mention_count = k.mention_count + 1,
                       k.last_mentioned = datetime()
        `, {
          customerId,
          name: person.name,
          relationship: person.relationship || 'unknown'
        });
      }

      // Create Event nodes
      for (const event of entities.events) {
        await tx.run(`
          MATCH (c:Customer {id: $customerId})
          CREATE (e:Event {
            id: randomUUID(),
            description: $description,
            life_area: $lifeArea,
            occurred_at: datetime()
          })
          MERGE (c)-[:EXPERIENCED]->(e)
        `, {
          customerId,
          description: event.description,
          lifeArea: event.life_area
        });

        // Link people to events
        for (const person of entities.people) {
          await tx.run(`
            MATCH (p:Person {name: $personName})
            MATCH (e:Event {description: $eventDesc})
            MERGE (p)-[:INVOLVED_IN]->(e)
          `, {
            personName: person.name,
            eventDesc: event.description
          });
        }
      }

      // Create Topic nodes
      for (const topic of entities.topics) {
        await tx.run(`
          MATCH (c:Customer {id: $customerId})
          MERGE (t:Topic {name: $topic})
          MERGE (c)-[r:INTERESTED_IN]->(t)
          ON CREATE SET r.count = 1
          ON MATCH SET r.count = r.count + 1
        `, { customerId, topic });
      }

      // Create Emotion nodes
      for (const emotion of entities.emotions) {
        await tx.run(`
          MATCH (c:Customer {id: $customerId})
          MERGE (em:Emotion {name: $emotion})
          MERGE (c)-[:FEELS {session_id: $sessionId, at: datetime()}]->(em)
        `, { customerId, emotion, sessionId });
      }

      // Link session to card draws
      await tx.run(`
        MERGE (s:ReadingSession {id: $sessionId})
        SET s.created_at = datetime()
        WITH s
        MATCH (c:Customer {id: $customerId})
        MERGE (c)-[:HAD_READING]->(s)
      `, { customerId, sessionId });
    });
  } finally {
    await session.close();
  }
}
```

### Relationship Strength Recalculation

```typescript
// Run after each session ends
async function recalculateStrength(
  customerId: string,
  personName: string
): Promise<number> {
  const session = neo4j.session();

  try {
    const result = await session.run(`
      MATCH (c:Customer {id: $customerId})-[k:KNOWS]->(p:Person {name: $personName})

      // Frequency score
      WITH c, k, p, k.mention_count AS mentions
      OPTIONAL MATCH (c)-[k2:KNOWS]->(p2:Person)
      WITH c, k, p, mentions, max(k2.mention_count) AS max_mentions
      WITH c, k, p, toFloat(mentions) / max_mentions AS freq_score

      // Recency score
      WITH c, k, p, freq_score,
        1.0 / (1.0 + duration.between(k.last_mentioned, datetime()).days / 30.0) AS rec_score

      // Sentiment impact (from FEELS edges during sessions mentioning this person)
      OPTIONAL MATCH (c)-[f:FEELS]->(em:Emotion)
      WITH c, k, p, freq_score, rec_score,
        CASE WHEN count(f) > 0 THEN abs(avg(
          CASE em.valence WHEN 'positive' THEN 0.5 WHEN 'negative' THEN -0.5 ELSE 0 END
        )) ELSE 0.3 END AS sent_score

      // Topic diversity
      OPTIONAL MATCH (c)-[:INTERESTED_IN]->(t:Topic)
      WITH c, k, p, freq_score, rec_score, sent_score,
        count(DISTINCT t) AS total_topics
      OPTIONAL MATCH (p)-[:INVOLVED_IN]->(e:Event)<-[:EXPERIENCED]-(c)
      OPTIONAL MATCH (c)-[:INTERESTED_IN]->(t2:Topic)
      WHERE any(keyword IN t2.name WHERE e.description CONTAINS keyword)
      WITH k, freq_score, rec_score, sent_score,
        CASE WHEN total_topics > 0
          THEN toFloat(count(DISTINCT t2)) / total_topics
          ELSE 0.2 END AS div_score

      // Combined strength
      SET k.strength = 0.30 * freq_score + 0.25 * rec_score
                     + 0.25 * sent_score + 0.20 * div_score

      RETURN k.strength AS new_strength
    `, { customerId, personName });

    return result.records[0]?.get('new_strength') ?? 0.5;
  } finally {
    await session.close();
  }
}
```

---

## Behavioral Profile Aggregation Job

```typescript
// Runs daily at 03:00 UTC
async function aggregateBehaviorProfile(customerId: string): Promise<void> {
  // Parallel data collection
  const [sessions, finances, visitPattern, sentimentTrend] = await Promise.all([
    // Recent sessions from PostgreSQL
    dal.query('tarot', 'session', {
      filters: { user_id: customerId },
      pagination: { limit: 100 }
    }),

    // Financial summary from PostgreSQL
    dal.query('customer', 'finance', {
      filters: { customer_id: customerId }
    }),

    // Visit pattern from MongoDB
    mongodb.aggregate('activity_events', [
      { $match: { customer_id: customerId, created_at: { $gte: ninetyDaysAgo } } },
      { $group: {
        _id: { hour: { $hour: '$created_at' }, day: { $dayOfWeek: '$created_at' } },
        count: { $sum: 1 }
      }}
    ]),

    // Sentiment trend from InfluxDB
    influxdb.query(`
      from(bucket: "hourly_data")
        |> range(start: -90d)
        |> filter(fn: (r) => r._measurement == "customer_sentiment")
        |> filter(fn: (r) => r.customer_id == "${customerId}")
        |> mean()
    `)
  ]);

  // Compute profile
  const profile = {
    customer_id: customerId,
    updated_at: new Date(),
    reading_patterns: {
      preferred_spread: computePreferredSpread(sessions),
      avg_sessions_per_month: sessions.length / 3,
      peak_hours: computePeakHours(visitPattern),
      peak_days: computePeakDays(visitPattern),
      common_topics: computeTopTopics(sessions, 5)
    },
    emotional_baseline: {
      avg_sentiment: sentimentTrend.mean ?? 0,
      sentiment_variance: sentimentTrend.stddev ?? 0,
      emotion_distribution: computeEmotionDistribution(sessions)
    },
    relationship_focus: {
      most_discussed_people: await getMostDiscussedPeople(customerId)
    },
    purchase_behavior: computePurchaseBehavior(finances)
  };

  // Upsert to MongoDB
  await mongodb.updateOne(
    'customer_behavior_profile',
    { customer_id: customerId },
    { $set: profile },
    { upsert: true }
  );
}
```

---

## Session End Pipeline (Orchestrator)

```typescript
// Called when a session ends
async function onSessionEnd(
  sessionId: string,
  customerId: string
): Promise<void> {
  // Step 1: Get working memory
  const workingMemory = await getWorkingMemory(sessionId);
  if (!workingMemory) return;

  // Step 2: Parallel writes
  await Promise.all([
    // Create session summary → Qdrant
    createSessionSummary(sessionId, customerId, workingMemory),

    // Write entities → Neo4j
    writeToGraph(customerId, sessionId,
      await extractEntities(
        workingMemory.messages.map(m => m.content).join(' '),
        ''
      )
    ),

    // Write final sentiment → InfluxDB
    influxdb.write('customer_sentiment', {
      customer_id: customerId,
      source: 'reading'
    }, {
      score: workingMemory.current_sentiment
    }),

    // Save raw conversation → MongoDB
    mongodb.insertOne('conversation_raw', {
      session_id: sessionId,
      customer_id: customerId,
      messages: workingMemory.messages,
      metadata: {
        topics: workingMemory.extracted_entities.topics,
        people: workingMemory.extracted_entities.people,
        turn_count: workingMemory.turn_count
      },
      created_at: new Date()
    }),

    // Publish Kafka event
    kafka.produce('reading.completed', {
      event_id: generateUUID(),
      event_type: 'reading.completed',
      correlation_id: sessionId,
      timestamp: new Date().toISOString(),
      source: 'tarot-reading',
      payload: {
        session_id: sessionId,
        customer_id: customerId,
        sentiment_score: workingMemory.current_sentiment,
        topics: workingMemory.extracted_entities.topics,
        people: workingMemory.extracted_entities.people
      }
    })
  ]);

  // Step 3: Clear working memory
  await clearWorkingMemory(sessionId);

  // Step 4: Check if long-term aggregation is needed
  const summaryCount = await qdrant.count('conversation_summaries', {
    filter: {
      must: [{ key: 'customer_id', match: { value: customerId } }]
    }
  });

  if (summaryCount % 5 === 0) {
    // Trigger long-term memory aggregation (async)
    await kafka.produce('memory.aggregate', {
      customer_id: customerId,
      summary_count: summaryCount
    });
  }
}
```
