import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = util.promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
let initialized = false;

export const prisma = new PrismaClient();

export async function initializeDatabase() {
  if (initialized) return;

  try {
    await execAsync('npx prisma db push --skip-generate --schema ../prisma/schema.prisma', {
      env: process.env,
      cwd: projectRoot,
    });
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize database schema:', error.stderr ?? error.message);
    throw error;
  }
}
