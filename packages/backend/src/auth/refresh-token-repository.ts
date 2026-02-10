import { getPool } from '../event-sourcing/database';

export async function createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  await getPool().query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
}

export async function findByTokenHash(tokenHash: string): Promise<{ id: string; user_id: string; expires_at: Date } | null> {
  const { rows } = await getPool().query(
    'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
    [tokenHash]
  );
  return rows[0] || null;
}

export async function deleteByTokenHash(tokenHash: string): Promise<void> {
  await getPool().query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}

export async function deleteAllForUser(userId: string): Promise<void> {
  await getPool().query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

export async function cleanupExpired(): Promise<void> {
  await getPool().query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
}
