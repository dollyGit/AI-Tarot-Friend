#!/usr/bin/env tsx
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../lib/logger';

const execAsync = promisify(exec);

async function runMigration(action: string, name?: string) {
  try {
    logger.info({ action, name }, 'Running database migration');

    let command = '';
    switch (action) {
      case 'up':
      case 'deploy':
        command = 'npx prisma migrate deploy';
        break;
      case 'dev':
        command = name
          ? `npx prisma migrate dev --name ${name}`
          : 'npx prisma migrate dev';
        break;
      case 'generate':
        if (!name) {
          logger.error('Migration name is required for generate');
          process.exit(1);
        }
        command = `npx prisma migrate dev --create-only --name ${name}`;
        break;
      case 'down':
      case 'revert':
        logger.warn('Prisma does not support automatic rollback. Please revert manually.');
        logger.info('Steps: 1) Delete the last migration directory');
        logger.info('       2) Run: npx prisma migrate dev');
        process.exit(0);
      case 'status':
        command = 'npx prisma migrate status';
        break;
      case 'reset':
        logger.warn('This will delete all data!');
        command = 'npx prisma migrate reset --force';
        break;
      default:
        logger.error({ action }, 'Unknown migration action');
        process.exit(1);
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    if (stdout) logger.info(stdout);
    if (stderr) logger.error(stderr);

    logger.info('Migration completed successfully');
  } catch (err) {
    logger.error({ err }, 'Migration failed');
    process.exit(1);
  }
}

// CLI argument parsing
const action = process.argv[2];
const name = process.argv[3];

if (!action) {
  console.log(`
Usage: tsx migrate.ts <action> [name]

Actions:
  up, deploy    - Apply pending migrations (production)
  dev           - Create and apply migration (development)
  generate      - Create migration without applying (requires name)
  status        - Show migration status
  reset         - Reset database (WARNING: deletes all data)

Examples:
  tsx migrate.ts deploy
  tsx migrate.ts dev add_user_table
  tsx migrate.ts generate add_feedback_table
  tsx migrate.ts status
`);
  process.exit(0);
}

runMigration(action, name);
