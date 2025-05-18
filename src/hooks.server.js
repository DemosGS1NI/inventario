import jwt from 'jsonwebtoken';
import { jwtConfig } from '$lib/jwt'; 

export async function handle({ event, resolve }) {
  const token = event.cookies.get(jwtConfig.cookie.name);

  if (token) {
    try {
      // Verify the token with the shared configuration
      const user = jwt.verify(token, jwtConfig.secret, jwtConfig.getVerifyOptions());

      // Attach user data to `locals`
      event.locals.user = {
        userId: user.userId,
        userName: user.userName,
        userRole: user.userRole,
        tokenId: user.jti
      };
      
      // Code for token revocation would go here
      // if (await isTokenRevoked(user.jti)) {
      //   event.cookies.delete(jwtConfig.cookie.name, { path: jwtConfig.cookie.path });
      //   return resolve(event);
      // }
    } catch (error) {
      // Handle different types of JWT errors
      if (error.name === 'TokenExpiredError') {
        console.log('Token expired');
        // Clear the expired token
        event.cookies.delete(jwtConfig.cookie.name, { path: jwtConfig.cookie.path });
      } else if (error.name === 'JsonWebTokenError') {
        console.log('Invalid token');
      } else {
        console.error('JWT verification error:', error.message);
      }
    }
  }

  // Only log in development and check if user exists
  if (process.env.NODE_ENV === 'development' && event.locals.user) {
    console.log("User authenticated:", event.locals.user.userId);
  }

  return resolve(event);
}