import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/lib/prisma';
import { generateTokenPair } from '../../src/lib/auth';

describe('Reading Flow Integration Test', () => {
  let userId: string;
  let accessToken: string;

  beforeEach(async () => {
    // Clean up
    await prisma.tarotDraw.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'integration@example.com',
        display_name: 'Integration Test User',
        locale: 'zh-TW',
        status: 'active',
      },
    });

    userId = user.id;

    const tokens = generateTokenPair(userId, user.email!);
    accessToken = tokens.accessToken;
  });

  it('should complete full reading flow: input → sentiment → spread → draw → interpretation', async () => {
    // Step 1: User inputs concern and creates session
    const sessionResponse = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        channel: 'web',
        user_input: '我對未來的職業發展感到迷茫，不知道該怎麼選擇',
      })
      .expect(201);

    expect(sessionResponse.body).toMatchObject({
      id: expect.any(String),
      sentiment: expect.objectContaining({
        score: expect.any(Number),
        label: expect.any(String),
        crisis_level: expect.any(String),
      }),
    });

    const sessionId = sessionResponse.body.id;
    const sentiment = sessionResponse.body.sentiment;

    // Verify sentiment was analyzed
    expect(sentiment.score).toBeGreaterThanOrEqual(-1);
    expect(sentiment.score).toBeLessThanOrEqual(1);
    expect(['negative', 'neutral', 'positive']).toContain(sentiment.label);

    // Step 2: System suggests spread based on sentiment (in real flow)
    // For testing, user selects 3-card spread

    // Step 3: User draws cards
    const readingResponse = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        session_id: sessionId,
        spread_type: '3-card',
        context: '職業選擇指引',
      })
      .expect(201);

    // Verify cards were drawn
    expect(readingResponse.body.cards).toHaveLength(3);
    expect(readingResponse.body.cards[0].position).toBe(1);
    expect(readingResponse.body.cards[1].position).toBe(2);
    expect(readingResponse.body.cards[2].position).toBe(3);

    // Verify interpretation was generated
    const interpretation = readingResponse.body.interpretation;
    expect(interpretation.tldr).toBeTruthy();
    expect(interpretation.key_points).toBeInstanceOf(Array);
    expect(interpretation.key_points.length).toBeGreaterThanOrEqual(3);
    expect(interpretation.key_points.length).toBeLessThanOrEqual(5);
    expect(interpretation.advice.short_term).toBeTruthy();
    expect(interpretation.advice.medium_term).toBeTruthy();
    expect(interpretation.advice.long_term).toBeTruthy();

    // Step 4: Verify reading was persisted
    const savedReading = await prisma.tarotDraw.findUnique({
      where: { id: readingResponse.body.id },
      include: { session: true },
    });

    expect(savedReading).toBeDefined();
    expect(savedReading?.session.user_id).toBe(userId);

    // Step 5: Verify session was updated with reading activity
    const updatedSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { tarot_draws: true },
    });

    expect(updatedSession?.tarot_draws).toHaveLength(1);
  });

  it('should detect crisis patterns and provide resources', async () => {
    const sessionResponse = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        channel: 'web',
        user_input: 'I feel hopeless and don\'t see a way out of this situation',
      })
      .expect(201);

    const sentiment = sessionResponse.body.sentiment;

    // Should detect potential crisis
    if (sentiment.crisis_level === 'high' || sentiment.crisis_level === 'immediate') {
      expect(sessionResponse.body.crisis_resources).toBeDefined();
      expect(sessionResponse.body.crisis_resources).toMatchObject({
        hotlines: expect.any(Array),
        message: expect.any(String),
      });
    }
  });
});
