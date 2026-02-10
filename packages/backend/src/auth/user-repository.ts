import { getPool } from '../event-sourcing/database';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  email_verification_token: string | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await getPool().query<UserRow>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

export async function findById(id: string): Promise<UserRow | null> {
  const { rows } = await getPool().query<UserRow>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
  role?: string;
  emailVerificationToken?: string;
}): Promise<UserRow> {
  const { rows } = await getPool().query<UserRow>(
    `INSERT INTO users (email, password_hash, name, role, email_verification_token)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.email, data.passwordHash, data.name, data.role || 'USER', data.emailVerificationToken || null]
  );
  return rows[0];
}

export async function updatePassword(id: string, passwordHash: string): Promise<void> {
  await getPool().query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, id]
  );
}

export async function updateRole(id: string, role: string): Promise<UserRow | null> {
  const { rows } = await getPool().query<UserRow>(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [role, id]
  );
  return rows[0] || null;
}

export async function updateStatus(id: string, isActive: boolean): Promise<UserRow | null> {
  const { rows } = await getPool().query<UserRow>(
    'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [isActive, id]
  );
  return rows[0] || null;
}

export async function setEmailVerified(id: string): Promise<void> {
  await getPool().query(
    'UPDATE users SET email_verified = true, email_verification_token = NULL, updated_at = NOW() WHERE id = $1',
    [id]
  );
}

export async function findByVerificationToken(token: string): Promise<UserRow | null> {
  const { rows } = await getPool().query<UserRow>(
    'SELECT * FROM users WHERE email_verification_token = $1',
    [token]
  );
  return rows[0] || null;
}

export async function setPasswordResetToken(id: string, token: string, expires: Date): Promise<void> {
  await getPool().query(
    'UPDATE users SET password_reset_token = $1, password_reset_expires = $2, updated_at = NOW() WHERE id = $3',
    [token, expires, id]
  );
}

export async function findByResetToken(token: string): Promise<UserRow | null> {
  const { rows } = await getPool().query<UserRow>(
    'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
    [token]
  );
  return rows[0] || null;
}

export async function clearResetToken(id: string): Promise<void> {
  await getPool().query(
    'UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW() WHERE id = $1',
    [id]
  );
}

export async function listAll(): Promise<UserRow[]> {
  const { rows } = await getPool().query<UserRow>(
    'SELECT * FROM users ORDER BY created_at DESC'
  );
  return rows;
}

export async function countUsers(): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>('SELECT COUNT(*) as count FROM users');
  return parseInt(rows[0].count, 10);
}
