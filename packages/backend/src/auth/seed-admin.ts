import bcrypt from 'bcryptjs';
import { authConfig } from './config';
import { countUsers, createUser } from './user-repository';

export async function seedAdminUser(): Promise<void> {
  const count = await countUsers();
  if (count > 0) return;

  const passwordHash = await bcrypt.hash('admin123', authConfig.bcryptRounds);
  await createUser({
    email: 'admin@hireme.dev',
    passwordHash,
    name: 'Admin',
    role: 'ADMIN',
  });

  console.log('[auth] Seeded admin user: admin@hireme.dev / admin123');
}
