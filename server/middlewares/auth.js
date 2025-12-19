import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config({ path: '.env.local' });

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || 'dev-jwt-secret';

const signAuthToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const getBearerToken = (req) => {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

const verifyAuthToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const requireAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
    }
    const decoded = verifyAuthToken(token);
    req.auth = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期', code: 'INVALID_TOKEN' });
  }
};

export { getBearerToken, requireAuth, signAuthToken, verifyAuthToken };
