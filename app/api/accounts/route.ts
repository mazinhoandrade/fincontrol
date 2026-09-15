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
    const { id, name, type, balance, institution, color, icon, accountNumber } = body;

    const account = await prisma.account.create({
      data: {
        id: id || undefined,
        name,
        type,
        balance: Number(balance) || 0,
        institution: institution || null,
        color: color || '#10b981',
        icon: icon || null,
        accountNumber: accountNumber || null,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, type, balance, institution, color, icon, accountNumber } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const existingAccount = await prisma.account.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: 'Conta não encontrada ou acesso não permitido' }, { status: 404 });
    }

    const updatedAccount = await prisma.account.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(balance !== undefined && { balance: Number(balance) }),
        ...(institution !== undefined && { institution }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(accountNumber !== undefined && { accountNumber }),
      },
    });

    return NextResponse.json({ success: true, account: updatedAccount });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const existingAccount = await prisma.account.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: 'Conta não encontrada ou acesso não permitido' }, { status: 404 });
    }

    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
