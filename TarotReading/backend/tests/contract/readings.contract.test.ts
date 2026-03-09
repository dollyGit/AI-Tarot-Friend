import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/lib/prisma';
import { generateTokenPair } from '../../src/lib/auth';

describe('POST /api/v1/readings - Contract Test', () => {
  let userId: string;
  let sessionId: string;
  let accessToken: string;

  beforeEach(async () => {
    // Clean up
    await prisma.tarotDraw.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        display_name: 'Test User',
        locale: 'en',
        status: 'active',
      },
    });

    userId = user.id;

    // Create test session
    const session = await prisma.session.create({
      data: {
        user_id: userId,
        channel: 'web',
        sentiment: {
          score: -0.3,
          label: 'negative',
          confidence: 0.85,
          crisis_level: 'none',
        },
      },
    });

    sessionId = session.id;

    const tokens = generateTokenPair(userId, user.email!);
    accessToken = tokens.accessToken;
  });

  it('should draw cards for 3-card spread and return 201 with cards and interpretation', async () => {
    const response = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        session_id: sessionId,
        spread_type: '3-card',
        context: 'I need guidance on my career path',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      session_id: sessionId,
      spread_type: '3-card',
      cards: expect.arrayContaining([
        expect.objectContaining({
          card_id: expect.any(Number),
          position: expect.any(Number),
          orientation: expect.stringMatching(/upright|reversed/),
          name: expect.any(String),
          meaning: expect.any(String),
        }),
      ]),
      interpretation: expect.objectContaining({
        tldr: expect.any(String),
        key_points: expect.arrayContaining([expect.any(String)]),
        advice: expect.objectContaining({
          short_term: expect.any(String),
          medium_term: expect.any(String),
          long_term: expect.any(String),
        }),
        warnings: expect.any(String),
      }),
      created_at: expect.any(String),
    });

    // Verify exactly 3 cards were drawn
    expect(response.body.cards).toHaveLength(3);

    // Verify reading was saved to database
    const reading = await prisma.tarotDraw.findUnique({
      where: { id: response.body.id },
    });

    expect(reading).toBeDefined();
  });

  it('should support single card draw', async () => {
    const response = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        session_id: sessionId,
        spread_type: '1-card',
      })
      .expect(201);

    expect(response.body.cards).toHaveLength(1);
  });

  it('should require premium for 7-card spread', async () => {
    const response = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        session_id: sessionId,
        spread_type: '7-card',
      })
      .expect(403);

    expect(response.body.error.code).toBe('PREMIUM_REQUIRED');
  });

  it('should support seed for reproducible draws (premium feature)', async () => {
    const seed = 'test-seed-123';

    const response1 = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        session_id: sessionId,
        spread_type: '3-card',
        seed,
      })
      .expect(201);

    const response2 = await request(app)
      .post('/api/v1/readings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        session_id: sessionId,
        spread_type: '3-card',
        seed,
      })
      .expect(201);

    // Same seed should produce same cards
    expect(response1.body.cards).toEqual(response2.body.cards);
  });

  it('should require authentication', async () => {
    await request(app)
      .post('/api/v1/readings')
      .send({
        session_id: sessionId,
        spread_type: '3-card',
      })
      .expect(401);
  });
});
