import bcrypt from 'bcryptjs';
import { prisma } from '../../db.js';
import type { AuthUser, Role } from '../../middleware/auth.js';

const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

// Hash factice : la durée de réponse ne révèle pas si l'email existe.
export const DUMMY_HASH = bcrypt.hashSync('compte-inexistant', BCRYPT_ROUNDS);

export async function findAccount(emailAddress: string) {
  const admin = await prisma.admin.findUnique({ where: { email: emailAddress } });
  if (admin) return { role: 'admin' as Role, account: admin };
  const courier = await prisma.courier.findUnique({ where: { email: emailAddress } });
  if (courier) return { role: 'livreur' as Role, account: courier };
  const client = await prisma.client.findUnique({ where: { email: emailAddress } });
  if (client) return { role: 'client' as Role, account: client };
  return null;
}

export async function emailTaken(emailAddress: string): Promise<boolean> {
  return (await findAccount(emailAddress)) !== null;
}

export async function profileOf(user: AuthUser) {
  if (user.role === 'admin') {
    const admin = await prisma.admin.findUnique({ where: { id: user.id } });
    return admin && { id: admin.id, role: user.role, prenom: admin.firstName, email: admin.email };
  }
  if (user.role === 'livreur') {
    const courier = await prisma.courier.findUnique({ where: { id: user.id } });
    return (
      courier && {
        id: courier.id,
        role: user.role,
        prenom: courier.firstName,
        nom: courier.lastName,
        email: courier.email,
      }
    );
  }
  const client = await prisma.client.findUnique({ where: { id: user.id } });
  return (
    client && {
      id: client.id,
      role: user.role,
      prenom: client.firstName,
      nom: client.lastName,
      email: client.email,
      telephone: client.phone,
      adresse: client.address,
      complementAdresse: client.addressDetails,
      accepteEmails: client.marketingOptIn,
    }
  );
}
