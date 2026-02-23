import express from "express";
import bcrypt from "bcryptjs";
import {
  authConfig,
  AuthContext,
  requireAuth,
  requireRole,
  findByEmail,
  findById as findUserById,
  createUser,
  updatePassword,
  updateRole,
  updateStatus,
  setEmailVerified,
  findByVerificationToken,
  setPasswordResetToken,
  findByResetToken,
  clearResetToken,
  listAll as listAllUsers,
  createRefreshToken,
  findByTokenHash,
  deleteByTokenHash,
  deleteAllForUser,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateRandomToken,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  accessCookieOptions,
  refreshCookieOptions,
  clearCookieOptions,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../auth";
import { formatUser } from "../formatters/auth.formatter";

export const authResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, context: AuthContext) => {
      if (!context.user) return null;
      if (authConfig.mock) {
        return { id: context.user.id, email: context.user.email, name: context.user.name, role: context.user.role, isActive: true, emailVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      }
      const user = await findUserById(context.user.id);
      return user ? formatUser(user) : null;
    },

    users: async (_: unknown, __: unknown, context: AuthContext) => {
      requireRole(context, 'ADMIN');
      const users = await listAllUsers();
      return users.map(formatUser);
    },

    user: async (_: unknown, args: { id: string }, context: AuthContext) => {
      requireRole(context, 'ADMIN');
      const user = await findUserById(args.id);
      return user ? formatUser(user) : null;
    },
  },

  Mutation: {
    register: async (_: unknown, args: { input: { email: string; password: string; name: string } }, context: { res: express.Response }) => {
      const existing = await findByEmail(args.input.email);
      if (existing) {
        throw new Error('Email already registered');
      }

      const passwordHash = await bcrypt.hash(args.input.password, authConfig.bcryptRounds);
      const verificationToken = generateRandomToken();
      const user = await createUser({
        email: args.input.email,
        passwordHash,
        name: args.input.name,
        emailVerificationToken: verificationToken,
      });

      sendVerificationEmail(user.email, user.name, verificationToken).catch(err =>
        console.error('[auth] Failed to send verification email:', err)
      );

      const tokenPayload = { userId: user.id, role: user.role };
      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      await createRefreshToken(user.id, hashToken(refreshToken), new Date(Date.now() + authConfig.refreshTokenTtlMs));

      context.res.cookie(COOKIE_ACCESS, accessToken, accessCookieOptions());
      context.res.cookie(COOKIE_REFRESH, refreshToken, refreshCookieOptions());

      return { user: formatUser(user), message: 'Registration successful. Please verify your email.' };
    },

    login: async (_: unknown, args: { input: { email: string; password: string } }, context: { res: express.Response }) => {
      const user = await findByEmail(args.input.email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const valid = await bcrypt.compare(args.input.password, user.password_hash);
      if (!valid) {
        throw new Error('Invalid email or password');
      }

      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      const tokenPayload = { userId: user.id, role: user.role };
      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      await createRefreshToken(user.id, hashToken(refreshToken), new Date(Date.now() + authConfig.refreshTokenTtlMs));

      context.res.cookie(COOKIE_ACCESS, accessToken, accessCookieOptions());
      context.res.cookie(COOKIE_REFRESH, refreshToken, refreshCookieOptions());

      return { user: formatUser(user) };
    },

    logout: async (_: unknown, __: unknown, context: AuthContext & { req: express.Request; res: express.Response }) => {
      const refreshToken = context.req.cookies?.[COOKIE_REFRESH];
      if (refreshToken) {
        await deleteByTokenHash(hashToken(refreshToken));
      }

      context.res.clearCookie(COOKIE_ACCESS, clearCookieOptions());
      context.res.clearCookie(COOKIE_REFRESH, clearCookieOptions());

      return { success: true, message: 'Logged out' };
    },

    refreshToken: async (_: unknown, __: unknown, context: { req: express.Request; res: express.Response }) => {
      const token = context.req.cookies?.[COOKIE_REFRESH];
      if (!token) {
        throw new Error('No refresh token');
      }

      let payload;
      try {
        payload = verifyRefreshToken(token);
      } catch {
        throw new Error('Invalid refresh token');
      }

      const stored = await findByTokenHash(hashToken(token));
      if (!stored) {
        throw new Error('Refresh token not found');
      }

      await deleteByTokenHash(hashToken(token));

      const user = await findUserById(payload.userId);
      if (!user || !user.is_active) {
        throw new Error('User not found or deactivated');
      }

      const newPayload = { userId: user.id, role: user.role };
      const newAccessToken = signAccessToken(newPayload);
      const newRefreshToken = signRefreshToken(newPayload);

      await createRefreshToken(user.id, hashToken(newRefreshToken), new Date(Date.now() + authConfig.refreshTokenTtlMs));

      context.res.cookie(COOKIE_ACCESS, newAccessToken, accessCookieOptions());
      context.res.cookie(COOKIE_REFRESH, newRefreshToken, refreshCookieOptions());

      return { user: formatUser(user) };
    },

    changePassword: async (_: unknown, args: { input: { currentPassword: string; newPassword: string } }, context: AuthContext) => {
      const authUser = requireAuth(context);
      const user = await findUserById(authUser.id);
      if (!user) throw new Error('User not found');

      const valid = await bcrypt.compare(args.input.currentPassword, user.password_hash);
      if (!valid) throw new Error('Current password is incorrect');

      const newHash = await bcrypt.hash(args.input.newPassword, authConfig.bcryptRounds);
      await updatePassword(user.id, newHash);

      return { success: true, message: 'Password changed' };
    },

    requestPasswordReset: async (_: unknown, args: { input: { email: string } }) => {
      const user = await findByEmail(args.input.email);
      if (user) {
        const token = generateRandomToken();
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        await setPasswordResetToken(user.id, token, expires);
        sendPasswordResetEmail(user.email, user.name, token).catch(err =>
          console.error('[auth] Failed to send reset email:', err)
        );
      }
      return { success: true, message: 'If the email exists, a reset link has been sent.' };
    },

    resetPassword: async (_: unknown, args: { input: { token: string; newPassword: string } }) => {
      const user = await findByResetToken(args.input.token);
      if (!user) throw new Error('Invalid or expired reset token');

      const newHash = await bcrypt.hash(args.input.newPassword, authConfig.bcryptRounds);
      await updatePassword(user.id, newHash);
      await clearResetToken(user.id);
      await deleteAllForUser(user.id);

      return { success: true, message: 'Password has been reset. Please login.' };
    },

    verifyEmail: async (_: unknown, args: { token: string }) => {
      const user = await findByVerificationToken(args.token);
      if (!user) throw new Error('Invalid verification token');

      await setEmailVerified(user.id);
      return { success: true, message: 'Email verified' };
    },

    updateUserRole: async (_: unknown, args: { input: { userId: string; role: string } }, context: AuthContext) => {
      requireRole(context, 'ADMIN');
      const user = await updateRole(args.input.userId, args.input.role);
      if (!user) throw new Error('User not found');
      return formatUser(user);
    },

    updateUserStatus: async (_: unknown, args: { input: { userId: string; isActive: boolean } }, context: AuthContext) => {
      requireRole(context, 'ADMIN');
      const user = await updateStatus(args.input.userId, args.input.isActive);
      if (!user) throw new Error('User not found');
      return formatUser(user);
    },
  },
};
