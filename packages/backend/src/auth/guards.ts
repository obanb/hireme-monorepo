import { GraphQLError } from 'graphql';
import { AuthContext, AuthUser } from './middleware';

export function requireAuth(context: AuthContext): AuthUser {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

export function requireRole(context: AuthContext, ...roles: string[]): AuthUser {
  const user = requireAuth(context);
  if (!roles.includes(user.role)) {
    throw new GraphQLError('Insufficient permissions', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return user;
}
