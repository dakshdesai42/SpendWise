import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    res.status(401).json({ error: 'Missing Firebase ID token' });
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    const bodyUserId = req.body?.userId;

    if (!bodyUserId || decoded.uid !== bodyUserId) {
      res.status(401).json({ error: 'Token UID does not match request userId' });
      return;
    }

    res.locals.uid = decoded.uid;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token verification failed';
    res.status(401).json({ error: message });
  }
}
