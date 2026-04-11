/**
 * Seed script for initializing admin user
 * Run: npx ts-node src/seed.ts
 *
 * This script creates the admin user for single-user system.
 * Admin credentials are read from environment variables:
 * - ADMIN_EMAIL
 * - ADMIN_PASSWORD
 * - ADMIN_NAME
 */

import dotenv from 'dotenv';
dotenv.config();

import { initializeAdminUser } from './services/authService';

async function seed() {
  console.log('Starting seed process...');
  console.log('');

  try {
    await initializeAdminUser();
    console.log('');
    console.log('Seed completed successfully!');
    console.log('');
    console.log('You can now login with the admin credentials.');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
