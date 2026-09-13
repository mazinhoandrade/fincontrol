import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, ids } = body;

    if (ids && Array.isArray(ids)) {
      for (const notifId of ids) {
        await prisma.readNotification.upsert({
          where: { id: notifId },
          update: {},
          create: { id: notifId },
        });
      }
      return NextResponse.json({ success: true, marked: ids.length });
    }

    if (id) {
      await prisma.readNotification.upsert({
        where: { id },
        update: {},
        create: { id },
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
