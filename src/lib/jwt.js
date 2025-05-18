// src/lib/jwt.js

/**
 * JWT Authentication Configuration
 */
export const jwtConfig = {
  // The secret key used to sign tokens
  get secret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET environment variable is not set!');
      throw new Error('JWT_SECRET must be set for secure authentication');
    }
    return secret;
  },
  
  // Token validity duration
  expiresIn: '1h',
  
  // Token issuer (your application name)
  issuer: 'inventory-app',
  
  // Token audience (who the token is intended for)
  audience: 'app-users',
  
  // Clock tolerance in seconds (handles small time differences between servers)
  clockTolerance: 30,
  
  // Cookie settings
  cookie: {
    // Cookie name
    name: 'jwt',
    
    // Cookie attributes
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    
    // Cookie max age in seconds (should match token expiration)
    // 3600 seconds = 1 hour
    maxAge: 3600
  },
  
  /**
   * Creates a cookie string with the token
   * @param {string} token - The JWT token
   * @returns {string} - The formatted cookie string
   */
  createAuthCookie(token) {
    const { name, httpOnly, secure, sameSite, path, maxAge } = this.cookie;
    
    return `${name}=${token}; ${httpOnly ? 'HttpOnly;' : ''} ${secure ? 'Secure;' : ''} ` +
           `Path=${path}; SameSite=${sameSite}; Max-Age=${maxAge}`;
  },
  
  /**
   * Gets standard JWT sign options
   * @returns {Object} - JWT sign options
   */
  getSignOptions() {
    return {
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audience
    };
  },
  
  /**
   * Gets standard JWT verify options
   * @returns {Object} - JWT verify options
   */
  getVerifyOptions() {
    return {
      issuer: this.issuer,
      audience: this.audience,
      clockTolerance: this.clockTolerance
    };
  }
};