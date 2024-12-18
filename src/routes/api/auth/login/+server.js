import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '$lib/responseUtils';

dotenv.config();

const rateLimitStore = new Map(); // Rate-limiting store
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes in milliseconds
const RATE_LIMIT_ATTEMPTS = 5; // Maximum attempts allowed
const BLOCK_DURATION = 10 * 60 * 1000; // Block duration (10 minutes)

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record) return false;

  if (record.blockUntil && record.blockUntil > now) {
    return true; // IP is blocked
  }

  return false;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip) || { attempts: 0, blockUntil: null };

  if (record.blockUntil && record.blockUntil > now) {
    return; // Already blocked
  }

  record.attempts++;

  if (record.attempts >= RATE_LIMIT_ATTEMPTS) {
    record.blockUntil = now + BLOCK_DURATION; // Block the IP
    record.attempts = 0; // Reset attempts after blocking
  }

  rateLimitStore.set(ip, record);

  // Automatically clean up old records after the rate limit window
  setTimeout(() => rateLimitStore.delete(ip), RATE_LIMIT_WINDOW);
}

function resetRateLimit(ip) {
  rateLimitStore.delete(ip); // Clear the record for the IP
}

export async function POST({ request, getClientAddress }) {
  const ip = getClientAddress();

  if (isRateLimited(ip)) {
    return errorResponse(429, 'TOO_MANY_REQUESTS', 'Too many login attempts. Please try again later.');
  }

  const { numero_telefono, pin } = await request.json();

  // Validate input
  if (!numero_telefono || !pin) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Phone number and PIN are required');
  }

  // Fetch user by phone number
  const result = await sql`
    SELECT id, pin_hash, activo, debe_cambiar_pin
    FROM usuarios
    WHERE numero_telefono = ${numero_telefono}
  `;

  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(pin, user.pin_hash))) {
    recordFailedAttempt(ip);
    return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid phone number or PIN');
  }

  if (!user.activo) {
    return errorResponse(403, 'ACCOUNT_INACTIVE', 'Account is inactive');
  }

  // Reset rate-limiting on successful login
  resetRateLimit(ip);

  // Create a session
  const sessionId = randomUUID();
  const sessionLifetime = 3600; // 1 hour in seconds
  const expiresAt = new Date(Date.now() + sessionLifetime * 1000).toISOString();

  await sql`
    INSERT INTO sessions (id, user_id, created_at, expires_at)
    VALUES (${sessionId}, ${user.id}, NOW(), ${expiresAt})
  `;

  const cookie = `sessionId=${sessionId}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=${sessionLifetime}`;

  return successResponse(
    { user: { debe_cambiar_pin: user.debe_cambiar_pin } },
    'Login successful!',
    { headers: { 'Set-Cookie': cookie } }
  );
}
