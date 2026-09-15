import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { initialCategories } from '@/lib/initialData';

/**
 * Retrieves the currently authenticated user from the incoming request.
 * Tries Better Auth getSession first, then falls back to direct session token lookup.
 */
export async function getCurrentUser(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (session?.user) {
      return session.user;
    }
  } catch (e) {
    console.error('getSession error:', e);
  }

  // Fallback: Check cookie directly against Session table in Postgres
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:better-auth\.session_token|__Secure-better-auth\.session_token)=([^;]+)/);
    if (match) {
      const rawCookieVal = decodeURIComponent(match[1]);
      const token = rawCookieVal.split('.')[0];
      const dbSession = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });
      if (dbSession && dbSession.expiresAt > new Date()) {
        return dbSession.user;
      }
    }
  } catch (e) {
    console.error('Session fallback error:', e);
  }

  return null;
}

/**
 * Seeds default initial categories and starter accounts for a user
 * if they do not yet have any.
 */
export async function seedDefaultUserData(userId: string) {
  const existingCategories = await prisma.category.count({ where: { userId } });
  if (existingCategories === 0) {
    for (const cat of initialCategories) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          userId,
        },
      });
    }
  }

  const existingAccounts = await prisma.account.count({ where: { userId } });
  if (existingAccounts === 0) {
    await prisma.account.createMany({
      data: [
        {
          name: 'Dinheiro Físico',
          type: 'dinheiro',
          balance: 0,
          institution: 'Espécie',
          color: '#10b981',
          icon: 'Coins',
          userId,
        },
        {
          name: 'Conta Principal',
          type: 'banco',
          balance: 0,
          institution: 'Banco Principal',
          color: '#8b5cf6',
          icon: 'Landmark',
          userId,
        },
        {
          name: 'Carteira de Investimentos',
          type: 'carteira',
          balance: 0,
          institution: 'Investimentos',
          color: '#06b6d4',
          icon: 'Wallet',
          userId,
        },
      ],
    });
  }
}
