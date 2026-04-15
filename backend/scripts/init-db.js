#!/usr/bin/env node

/**
 * Database Initialization Script
 * - Checks if migrations are needed
 * - Creates/applies migrations automatically
 * - Creates default admin user with UUID
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@kanadojo.local',
  password: 'admin123', // Change this in production!
  role: 'admin'
};

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function checkDatabaseExists() {
  try {
    // Try to connect and query
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}

async function applyMigrations() {
  console.log('📦 Applying migrations...');

  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Migrations applied');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

async function generatePrismaClient() {
  console.log('� Generating Prisma Client...');

  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Prisma Client generated');
  } catch (error) {
    console.error('❌ Prisma generation failed:', error.message);
    throw error;
  }
}

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { username: DEFAULT_ADMIN.username },
          { email: DEFAULT_ADMIN.email }
        ]
      }
    });

    if (existingAdmin) {
      console.log('👤 Admin user already exists');
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   UUID: ${existingAdmin.id}`);
      return;
    }

    // Create admin user
    const passwordHash = await hashPassword(DEFAULT_ADMIN.password);
    const admin = await prisma.user.create({
      data: {
        username: DEFAULT_ADMIN.username,
        email: DEFAULT_ADMIN.email,
        passwordHash,
        role: DEFAULT_ADMIN.role
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password: ${DEFAULT_ADMIN.password}`);
    console.log(`   UUID: ${admin.id}`);
    console.log('   ⚠️  Please change the default password after first login!');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    throw error;
  }
}

async function initializeDatabase() {
  console.log('🚀 Starting database initialization...\n');

  try {
    // Always apply migrations first
    console.log('📋 Applying all pending migrations...\n');
    await applyMigrations();
    console.log('');

    // Generate Prisma client (Skipped in Docker runtime due to permissions, already done in build)
    // await generatePrismaClient();
    // console.log('');

    // Create admin user (will skip if exists)
    await createAdminUser();

    console.log('\n🎉 Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run initialization
initializeDatabase();
