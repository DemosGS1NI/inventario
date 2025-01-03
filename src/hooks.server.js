import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-secret';

export async function handle({ event, resolve }) {
  const token = event.cookies.get('jwt'); // Get JWT from cookie

  if (token) {
    try {
      // Verify the token
      const user = jwt.verify(token, JWT_SECRET);

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

  console.log("Hooks is making available this info:", event.locals.user);

  return resolve(event);
}
