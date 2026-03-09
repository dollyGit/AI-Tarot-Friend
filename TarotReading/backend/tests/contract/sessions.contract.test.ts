import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/lib/prisma';
import { generateTokenPair } from '../../src/lib/auth';

describe('POST /api/v1/sessions - Contract Test', () => {
  let userId: string;
  let accessToken: string;

  beforeEach(async () => {
    // Clean up
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
    const tokens = generateTokenPair(userId, user.email!);
    accessToken = tokens.accessToken;
  });

  it('should create a new session and return 201 with session_id and sentiment', async () => {
    const response = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        channel: 'web',
        user_input: 'I am worried about my career change',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      user_id: userId,
      channel: 'web',
      sentiment: expect.objectContaining({
        score: expect.any(Number),
        label: expect.stringMatching(/negative|neutral|positive/),
        confidence: expect.any(Number),
        crisis_level: expect.stringMatching(/none|moderate|high|immediate/),
      }),
      created_at: expect.any(String),
    });

    // Verify session was created in database
    const session = await prisma.session.findUnique({
      where: { id: response.body.id },
    });

    expect(session).toBeDefined();
    expect(session?.user_id).toBe(userId);
  });

  it('should require authentication', async () => {
    await request(app)
      .post('/api/v1/sessions')
      .send({ channel: 'web' })
      .expect(401);
  });

  it('should validate channel field', async () => {
    const response = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        channel: 'invalid-channel',
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
