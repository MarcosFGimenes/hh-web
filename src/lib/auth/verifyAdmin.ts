import { adminAuth } from '../firebase/admin';

export async function verifyAdmin(idToken: string) {
  if (!idToken) {
    throw new Error('ID token ausente na requisição.');
  }

  return adminAuth.verifyIdToken(idToken);
}
