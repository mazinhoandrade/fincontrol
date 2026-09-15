import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, seedDefaultUserData } from '@/lib/auth-server';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Ensure this user has starter categories and accounts
    await seedDefaultUserData(user.id);

    const [categories, accounts, bills, transactions, readNotifs] = await Promise.all([
      prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
      prisma.account.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
      prisma.bill.findMany({ where: { userId: user.id }, orderBy: { dueDate: 'asc' } }),
      prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' } }),
      prisma.readNotification.findMany({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      success: true,
      source: 'neondb',
      accounts,
      transactions,
      bills,
      categories,
      readNotifIds: readNotifs.map((n) => n.notificationId),
    });
  } catch (error) {
    console.error('Error fetching data from Neon DB:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    if (body.action === 'reset') {
      // Clear existing records solely for the current user
      await prisma.transaction.deleteMany({ where: { userId: user.id } });
      await prisma.bill.deleteMany({ where: { userId: user.id } });
      await prisma.account.deleteMany({ where: { userId: user.id } });
      await prisma.category.deleteMany({ where: { userId: user.id } });
      await prisma.readNotification.deleteMany({ where: { userId: user.id } });

      // Seed fresh initial data for this user
      await seedDefaultUserData(user.id);

      const [categories, accounts, bills, transactions] = await Promise.all([
        prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
        prisma.account.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
        prisma.bill.findMany({ where: { userId: user.id }, orderBy: { dueDate: 'asc' } }),
        prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' } }),
      ]);

      return NextResponse.json({
        success: true,
        source: 'neondb',
        accounts,
        transactions,
        bills,
        categories,
        readNotifIds: [],
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error resetting Neon DB:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
