import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ids } = body;

    if (ids && Array.isArray(ids)) {
      for (const notifId of ids) {
        await prisma.readNotification.upsert({
          where: {
            userId_notificationId: {
              userId: user.id,
              notificationId: notifId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            notificationId: notifId,
          },
        });
      }
      return NextResponse.json({ success: true, marked: ids.length });
    }

    if (id) {
      await prisma.readNotification.upsert({
        where: {
          userId_notificationId: {
            userId: user.id,
            notificationId: id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          notificationId: id,
        },
      });
      return NextResponse.json({ success: true, marked: 1 });
    }

    return NextResponse.json({ error: 'Notification ID or IDs required' }, { status: 400 });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
