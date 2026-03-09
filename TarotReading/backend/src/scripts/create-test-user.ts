/**
 * Create test user and generate auth token
 * For development/testing purposes only
 */

import { prisma } from '../lib/prisma';
import { generateTokenPair } from '../lib/auth';

async function createTestUser() {
  try {
    // Check if test user already exists
    let user = await prisma.user.findFirst({
      where: { email: 'test@example.com' },
    });

    if (user) {
      console.log('✓ Test user already exists');
    } else {
      // Create test user
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          display_name: 'Test User',
          locale: 'en',
          status: 'active',
        },
      });
      console.log('✓ Test user created');
    }

    // Generate tokens
    const tokens = generateTokenPair(user.id, user.email || undefined);

    console.log('\n===========================================');
    console.log('Test User Created Successfully!');
    console.log('===========================================');
    console.log('\nUser Details:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Display Name:', user.display_name);
    console.log('\nAuthentication Tokens:');
    console.log('  Access Token:', tokens.accessToken);
    console.log('  Refresh Token:', tokens.refreshToken);
    console.log('\n===========================================');
    console.log('To use in the browser:');
    console.log('===========================================');
    console.log('\n1. Open browser console (F12)');
    console.log('2. Run this command:');
    console.log(`\n   localStorage.setItem('auth_token', '${tokens.accessToken}')\n`);
    console.log('3. Refresh the page');
    console.log('\n===========================================\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createTestUser();
