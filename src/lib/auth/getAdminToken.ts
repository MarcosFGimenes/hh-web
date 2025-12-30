import { headers } from 'next/headers';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { verifyAdmin } from './verifyAdmin';

export type AdminContext = {
  token: DecodedIdToken;
  companyId: string;
};

export async function getAdminFromRequest(): Promise<AdminContext> {
  const authHeader = headers().get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Authorization header ausente ou inválido.');
  }

  const token = authHeader.slice('Bearer '.length);
  const decoded = await verifyAdmin(token);
  const companyId =
    (decoded as DecodedIdToken & { companyId?: string }).companyId ||
    (decoded as DecodedIdToken & { organizationId?: string }).organizationId ||
    (decoded as DecodedIdToken & { tenantId?: string }).tenantId;

  if (!companyId) {
    throw new Error('Administrador sem empresa vinculada.');
  }

  return { token: decoded, companyId };
}
