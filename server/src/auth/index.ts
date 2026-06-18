import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserContext } from '../types';
import { Role } from '../config/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

export const generateToken = (user: { id: number; username: string; role: Role }): string => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token: string): UserContext | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
  } catch {
    return null;
  }
};

export const hashPassword = (password: string): string => {
  return bcrypt.hashSync(password, 10);
};

export const comparePassword = (password: string, hash: string): boolean => {
  return bcrypt.compareSync(password, hash);
};

export const extractTokenFromRequest = (req: any): string | null => {
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (req.query?.token) {
    return req.query.token;
  }
  if (req.body?.token) {
    return req.body.token;
  }
  return null;
};

export const extractTokenFromConnectionParams = (params: any): string | null => {
  const token = params?.authorization || params?.token;
  if (token && token.startsWith('Bearer ')) {
    return token.slice(7);
  }
  return token || null;
};
