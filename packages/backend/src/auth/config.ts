export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  resendApiKey: process.env.RESEND_API_KEY || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  mock: process.env.AUTH_MOCK === 'true',
  accessTokenTtl: '15m',
  refreshTokenTtl: '7d',
  refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  bcryptRounds: 12,
};
