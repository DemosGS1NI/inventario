import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ;

export async function handle({ event, resolve }) {
  const token = event.cookies.get('jwt'); // Get JWT from cookie

  if (token) {
    try {
      // Verify the token
      const user = jwt.verify(token, JWT_SECRET);

      // Add validation
      if (!JWT_SECRET) {
        console.error('JWT_SECRET environment variable is not set!');
        throw new Error('JWT_SECRET must be set for secure authentication');
      }      

      // Attach user data to `locals`
      event.locals.user = {
        userId: user.userId,
        userName: user.userName,
        userRole: user.userRole,
      };
    } catch (error) {
      console.error('Invalid JWT:', error.message);
    }
  }

  if (process.env.NODE_ENV === 'development') {
      console.log("User authenticated:", event.locals.user.userId);
  }


  return resolve(event);
}
