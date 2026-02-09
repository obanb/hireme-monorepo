# Phase 1: Authentication & Authorization System

## Context

The Hotel CMS has zero authentication — all pages are public, the user "John Doe / Admin" is hardcoded in the sidebar, and no user/session tables exist. We need a complete auth system with login/register, JWT sessions, role-based access, email verification, password reset, mock mode for dev, and account administration pages.

**Decisions**: Auth lives inside the existing backend subgraph (not a new service). JWT in httpOnly cookies (access + refresh tokens). Resend for email. Phase 1 scope — SSO and 2FA deferred.

## New Dependencies

**Backend** (`packages/backend/package.json`):
- `bcryptjs` + `@types/bcryptjs` — password hashing
- `jsonwebtoken` + `@types/jsonwebtoken` — JWT sign/verify
- `cookie-parser` + `@types/cookie-parser` — parse cookies in Express
- `resend` — email sending (falls back to console.log if no API key)

**Frontend**: None needed (browser handles cookies natively)

## Files to Create (20)

### Backend Auth Module (`packages/backend/src/auth/`)

| # | File | Purpose |
|---|------|---------|
| 1 | `auth.graphql` (in shared-schema/schema/) | GraphQL types: `User`, `UserRole` enum (ADMIN/USER/VIEWER), `AuthPayload`, auth queries (`me`, `users`, `user`) and mutations (`register`, `login`, `logout`, `refreshToken`, `changePassword`, `requestPasswordReset`, `resetPassword`, `verifyEmail`, `updateUserRole`, `updateUserStatus`) |
| 2 | `config.ts` | Auth env config: JWT_SECRET, JWT_REFRESH_SECRET, RESEND_API_KEY, FRONTEND_URL, AUTH_MOCK |
| 3 | `database.ts` | `initializeAuthTables()` — creates `users` table (id, email, password_hash, name, role, is_active, email_verified, verification/reset tokens) and `refresh_tokens` table (id, user_id, token_hash, expires_at) |
| 4 | `user-repository.ts` | Simple CRUD (NOT event-sourced): findByEmail, findById, create, updatePassword, updateRole, updateStatus, setEmailVerified, token management, listAll |
| 5 | `refresh-token-repository.ts` | create, findByTokenHash, deleteByTokenHash, deleteAllForUser, cleanupExpired |
| 6 | `token-service.ts` | signAccessToken (15min), signRefreshToken (7d), verify functions, hashToken, cookie name constants, cookie option factories |
| 7 | `email-service.ts` | sendVerificationEmail, sendPasswordResetEmail via Resend SDK. Falls back to console.log when RESEND_API_KEY unset |
| 8 | `middleware.ts` | `extractAuthContext(req)` — reads JWT from cookie, returns `{ user }`. When AUTH_MOCK=true, returns hardcoded admin user |
| 9 | `guards.ts` | `requireAuth(context)` throws UNAUTHENTICATED, `requireRole(context, ...roles)` throws FORBIDDEN |
| 10 | `seed-admin.ts` | `seedAdminUser()` — creates admin@hireme.dev / admin123 if no users exist |
| 11 | `index.ts` | Barrel export of all auth modules |

### Frontend Auth Pages

| # | File | Purpose |
|---|------|---------|
| 12 | `packages/frontend/middleware.ts` | Next.js middleware: checks `hireme_access_token` cookie, redirects to /login if missing on /hotel-cms/* routes |
| 13 | `packages/frontend/src/context/AuthContext.tsx` | React context: `useAuth()` hook providing user, loading, login(), logout(), refreshUser(). Queries `{ me }` on mount |
| 14 | `src/app/login/page.tsx` | Email + password form, calls login mutation, redirects to /hotel-cms |
| 15 | `src/app/register/page.tsx` | Name + email + password form, calls register mutation |
| 16 | `src/app/forgot-password/page.tsx` | Email form, calls requestPasswordReset mutation |
| 17 | `src/app/reset-password/page.tsx` | Reads token from URL, new password form, calls resetPassword mutation |
| 18 | `src/app/verify-email/page.tsx` | Reads token from URL, calls verifyEmail mutation on mount |
| 19 | `src/app/hotel-cms/settings/page.tsx` | Account settings: profile info, change password form |
| 20 | `src/app/hotel-cms/users/page.tsx` | ADMIN-only user management: list users, change roles, toggle active |

## Files to Modify (16)

| # | File | Change |
|---|------|--------|
| 1 | `packages/shared-schema/src/index.ts` | Add `getAuthSchema()` + include in `getCombinedSchema()` |
| 2 | `packages/backend/package.json` | Add bcryptjs, jsonwebtoken, cookie-parser, resend + @types |
| 3 | `packages/backend/src/index.ts` | **(biggest change)** Add cookie-parser middleware, CORS with `credentials: true` + explicit origin, call `initializeAuthTables()` + `seedAdminUser()` at startup, modify Apollo context to call `extractAuthContext(req)` and pass `res`/`req`, add all auth Query/Mutation resolvers, add `requireAuth` guards to existing mutations |
| 4 | `packages/frontend/src/app/layout.tsx` | Wrap children in `<AuthProvider>` |
| 5 | `packages/frontend/src/components/HotelSidebar.tsx` | Replace hardcoded "John Doe/Admin" with `useAuth()` user data, add Users nav item for ADMIN, add logout button, filter menu items by role for VIEWER |
| 6-16 | All 11 frontend pages with `fetch()` calls | Add `credentials: 'include'` to every `fetch(GRAPHQL_ENDPOINT, ...)` call (bookings, rooms, reception, calendar, room-types, rate-codes, wellness, vouchers, statistics, DashboardStats, RoomCalendar) |

## Implementation Order

### Stage A: Schema + Backend Auth Module
1. Create `packages/shared-schema/schema/auth.graphql`
2. Modify `packages/shared-schema/src/index.ts` — add getAuthSchema
3. Build shared-schema: `cd packages/shared-schema && npm run build`
4. Add deps to `packages/backend/package.json` + `npm install`
5. Create all files in `packages/backend/src/auth/` (config -> database -> user-repository -> refresh-token-repository -> token-service -> email-service -> middleware -> guards -> seed-admin -> index)
6. Modify `packages/backend/src/index.ts` — integrate auth
7. Build backend: `cd packages/backend && npm run build`

### Stage B: Frontend Auth
8. Create `packages/frontend/middleware.ts`
9. Create `packages/frontend/src/context/AuthContext.tsx`
10. Modify `packages/frontend/src/app/layout.tsx` — add AuthProvider
11. Create login, register, forgot-password, reset-password, verify-email pages
12. Modify `HotelSidebar.tsx` — real user data
13. Create settings + users admin pages
14. Add `credentials: 'include'` to all existing fetch calls
15. Build frontend: `cd packages/frontend && npx next build`

## Key Design Details

### Mock Mode
When `AUTH_MOCK=true` (env var), the auth middleware injects a hardcoded admin user into every request context. No login required. All guards pass. Frontend middleware also checks `NEXT_PUBLIC_AUTH_MOCK=true` to skip cookie checks — allowing full local dev without any auth flow.

### CORS with Credentials
The backend CORS config MUST change from `cors()` to `cors({ origin: 'http://localhost:3000', credentials: true })`. Without `credentials: true`, the browser won't send/receive httpOnly cookies cross-origin. The origin cannot be `*` when credentials are enabled.

### Role-Based Access
- **ADMIN**: Full access to all pages + user management
- **USER**: All pages except user management
- **VIEWER**: Dashboard, Calendar, Bookings only (filtered in sidebar + backend guards)

### Cookie Strategy
- `hireme_access_token`: httpOnly, 15min TTL, sent on every request
- `hireme_refresh_token`: httpOnly, 7d TTL, used only for refresh
- Both: secure=true in production, sameSite=lax, path=/

### GraphQL Schema (auth.graphql)

```graphql
enum UserRole {
  ADMIN
  USER
  VIEWER
}

type User {
  id: ID!
  email: String!
  name: String!
  role: UserRole!
  isActive: Boolean!
  emailVerified: Boolean!
  createdAt: String!
  updatedAt: String!
}

type AuthPayload {
  user: User!
  message: String
}

type AuthMessage {
  success: Boolean!
  message: String!
}

input RegisterInput {
  email: String!
  password: String!
  name: String!
}

input LoginInput {
  email: String!
  password: String!
}

input ChangePasswordInput {
  currentPassword: String!
  newPassword: String!
}

input RequestPasswordResetInput {
  email: String!
}

input ResetPasswordInput {
  token: String!
  newPassword: String!
}

input UpdateUserRoleInput {
  userId: ID!
  role: UserRole!
}

input UpdateUserStatusInput {
  userId: ID!
  isActive: Boolean!
}

extend type Query {
  me: User
  users: [User!]!
  user(id: ID!): User
}

extend type Mutation {
  register(input: RegisterInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  logout: AuthMessage!
  refreshToken: AuthPayload!
  changePassword(input: ChangePasswordInput!): AuthMessage!
  requestPasswordReset(input: RequestPasswordResetInput!): AuthMessage!
  resetPassword(input: ResetPasswordInput!): AuthMessage!
  updateUserRole(input: UpdateUserRoleInput!): User!
  updateUserStatus(input: UpdateUserStatusInput!): User!
  verifyEmail(token: String!): AuthMessage!
}
```

### Database Tables

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Auth Resolvers (key logic)

| Mutation | Logic |
|----------|-------|
| `register` | Hash password (bcrypt, 12 rounds) -> create user -> generate email verification token (crypto.randomBytes) -> store token -> send verification email via Resend -> generate JWT access+refresh tokens -> set httpOnly cookies -> return user |
| `login` | Find user by email -> bcrypt.compare password -> check isActive -> generate tokens -> store refresh token hash in DB -> set cookies -> return user |
| `logout` | Clear both cookies -> delete refresh token from DB -> return success |
| `refreshToken` | Read refresh cookie -> verify JWT -> lookup hash in DB -> generate new token pair -> rotate refresh token -> set cookies -> return user |
| `changePassword` | requireAuth -> verify old password -> hash new -> update |
| `requestPasswordReset` | Find by email -> generate token with 1h expiry -> send email -> always return success (don't leak email existence) |
| `resetPassword` | Find by token -> check expiry -> hash new password -> update -> clear token |
| `verifyEmail` | Find by verification token -> mark verified -> clear token |
| `updateUserRole` | requireRole(ADMIN) -> update user role |
| `updateUserStatus` | requireRole(ADMIN) -> update active status |

### Auth Guard Pattern

```typescript
// Used in resolvers — simple function calls, no directives
function requireAuth(context: AuthContext) {
  if (!context.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  return context.user;
}

function requireRole(context: AuthContext, ...roles: string[]) {
  const user = requireAuth(context);
  if (!roles.includes(user.role)) throw new GraphQLError('Insufficient permissions', { extensions: { code: 'FORBIDDEN' } });
  return user;
}

// Applied to existing mutations:
createReservation: async (_: unknown, args, context) => {
  requireAuth(context);  // <-- added
  // ... existing logic
}
```

### Frontend AuthContext

```typescript
// packages/frontend/src/context/AuthContext.tsx
// Provides: user, loading, login(), logout(), refreshUser()
// On mount: queries { me } with credentials: 'include'
// login(): calls login mutation, sets user state
// logout(): calls logout mutation, redirects to /login
```

### Next.js Middleware

```typescript
// packages/frontend/middleware.ts
// Public paths: /login, /register, /verify-email, /reset-password, /forgot-password, /, /api-docs
// Protected: /hotel-cms/* — requires hireme_access_token cookie
// If NEXT_PUBLIC_AUTH_MOCK=true, skip all checks
```

## Environment Variables

```env
# Required for production
JWT_SECRET=<random-64-char>
JWT_REFRESH_SECRET=<random-64-char>
RESEND_API_KEY=<from-resend.com>
FRONTEND_URL=https://your-domain.com

# Dev convenience (all optional)
AUTH_MOCK=true              # skip all backend auth, mock admin user
NEXT_PUBLIC_AUTH_MOCK=true  # skip frontend middleware check
```

For local dev with `AUTH_MOCK=true`, no other auth env vars needed.

## Verification

1. **Build**: shared-schema + backend + frontend compile clean
2. **Mock mode**: Set AUTH_MOCK=true, start backend, query `{ me { id email role } }` -> returns mock admin
3. **Register flow**: Unset AUTH_MOCK, call register mutation -> user created in DB, verification email logged to console
4. **Login flow**: Call login mutation -> cookies set, `{ me }` returns user
5. **Route protection**: Without cookie, `localhost:3000/hotel-cms` redirects to `/login`
6. **Role guard**: Login as VIEWER, try calling `mutation { createRoom(...) }` -> FORBIDDEN error
7. **Password reset**: Call requestPasswordReset -> token logged to console -> use in resetPassword mutation
8. **Admin panel**: Login as admin, navigate to /hotel-cms/users, change another user's role
9. **Logout**: Call logout mutation -> cookies cleared, `{ me }` returns null

## Phase 2 (future, not in scope)
- SSO: Google + Microsoft OAuth via passport.js
- 2FA: TOTP (authenticator app) with `otplib`
- Session revocation dashboard
- Audit log for auth events
