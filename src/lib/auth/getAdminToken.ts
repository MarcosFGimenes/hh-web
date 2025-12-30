import { headers } from 'next/headers';
import { verifyAdmin } from './verifyAdmin';

export async function getAdminFromRequest() {
  const authHeader = headers().get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Authorization header ausente ou inválido.');
  }

  const token = authHeader.slice('Bearer '.length);
  return verifyAdmin(token);
}
