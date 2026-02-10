import { Request } from 'express';
import { authConfig } from './config';
import { verifyAccessToken } from './token-service';
import { findById } from './user-repository';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
}

export interface AuthContext {
  user: AuthUser | null;
}

const MOCK_ADMIN: AuthUser = {
  id: 'mock-admin-id',
  email: 'admin@hireme.dev',
  name: 'Admin (Mock)',
  role: 'ADMIN',
  isActive: true,
  emailVerified: true,
};

export async function extractAuthContext(req: Request): Promise<AuthContext> {
  if (authConfig.mock) {
    return { user: MOCK_ADMIN };
  }

  const token = req.cookies?.hireme_access_token;
  if (!token) {
    return { user: null };
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await findById(payload.userId);
    if (!user || !user.is_active) {
      return { user: null };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.is_active,
        emailVerified: user.email_verified,
      },
    };
  } catch {
    return { user: null };
  }
}
