import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Single source of truth: apps/backend/.env
const backendEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(backendEnv)) {
  dotenv.config({ path: backendEnv });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });
}
