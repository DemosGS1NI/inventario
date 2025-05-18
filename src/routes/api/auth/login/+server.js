import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '$lib/jwt';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '$lib/responseUtils';

dotenv.config();

// Rate limiting configuration
// Note: In production, this should be replaced with a distributed store like Redis
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes in milliseconds
const RATE_LIMIT_ATTEMPTS = 5; // Maximum attempts allowed
const BLOCK_DURATION = 10 * 60 * 1000; // Block duration (10 minutes)
const rateLimitStore = new Map(); // Rate-limiting store

/**
 * Checks if the IP is currently rate limited
 * @param {string} ip - The IP address
 * @returns {boolean} - Whether the IP is rate limited
 */
function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record) return false;

  if (record.blockUntil && record.blockUntil > now) {
    return true; // IP is blocked
  }

  return false;
}

/**
 * Records a failed login attempt
 * @param {string} ip - The IP address
 */
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

/**
 * Resets rate limiting for an IP
 * @param {string} ip - The IP address
 */
function resetRateLimit(ip) {
  rateLimitStore.delete(ip); // Clear the record for the IP
}

/**
 * Handles POST requests for user login
 */
export async function POST({ request, getClientAddress }) {
  const ip = getClientAddress();

  if (isRateLimited(ip)) {
    return errorResponse(429, 'TOO_MANY_REQUESTS', 'Too many login attempts. Please try again later.');
  }

  try {
    const { numero_telefono, pin } = await request.json();

    // Validate input
    if (!numero_telefono || !pin) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Phone number and PIN are required');
    }

    // Fetch user by phone number
    const result = await sql`
      SELECT u.id, pin_hash, activo, debe_cambiar_pin, nombre, r.nombre_rol
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE numero_telefono = ${numero_telefono}
    `;

    const user = result.rows[0];

    // Check if user exists and PIN is correct
    if (!user || !(await bcrypt.compare(pin, user.pin_hash))) {
      recordFailedAttempt(ip);
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid phone number or PIN');
    }

    // Check if user account is active
    if (!user.activo) {
      return errorResponse(403, 'ACCOUNT_INACTIVE', 'Account is inactive');
    }

    // Reset rate-limiting on successful login
    resetRateLimit(ip);

    // Create JWT payload with minimal sensitive data
    const payload = {
      userId: user.id,
      userName: user.nombre,
      userRole: user.nombre_rol,
      // Add a unique token identifier for potential revocation
      jti: crypto.randomUUID()
    };

    // Sign the JWT with the shared configuration
    const token = jwt.sign(payload, jwtConfig.secret, jwtConfig.getSignOptions());

    // Create the auth cookie
    const cookie = jwtConfig.createAuthCookie(token);

    // Log non-sensitive info about login (for auditing)
    console.log(`User ID ${user.id} logged in successfully`);

    return successResponse(
      { user: { debe_cambiar_pin: user.debe_cambiar_pin } },
      'Login successful!',
      { headers: { 'Set-Cookie': cookie } }
    );
  } catch (error) {
    console.error('Error during login:', error);
    
    // Return a generic error message to avoid information leakage
    return errorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred during login'
    );
  }
}