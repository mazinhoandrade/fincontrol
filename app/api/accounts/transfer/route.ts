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
    const { fromId, toId, amount, description } = body;

    const numAmount = Number(amount);
    if (!fromId || !toId || numAmount <= 0) {
      return NextResponse.json({ error: 'Parâmetros de transferência inválidos' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const result = await prisma.$transaction(async (tx: any) => {
      const fromAcc = await tx.account.findFirst({
        where: { id: fromId, userId: user.id },
      });
      const toAcc = await tx.account.findFirst({
        where: { id: toId, userId: user.id },
      });

      if (!fromAcc || !toAcc) {
        throw new Error('Uma ou ambas as contas não foram encontradas ou não pertencem ao usuário');
      }

      // Find an appropriate category for this user
      let category = await tx.category.findFirst({
        where: {
          userId: user.id,
          OR: [{ name: { contains: 'Outros', mode: 'insensitive' } }, { type: 'both' }],
        },
      });

      if (!category) {
        category = await tx.category.findFirst({
          where: { userId: user.id },
        });
      }

      if (!category) {
        category = await tx.category.create({
          data: {
            name: 'Outros',
            type: 'both',
            icon: 'Tag',
            color: '#64748b',
            userId: user.id,
          },
        });
      }

      // Decrement from sender
      await tx.account.update({
        where: { id: fromId },
        data: { balance: { decrement: numAmount } },
      });

      // Increment receiver
      await tx.account.update({
        where: { id: toId },
        data: { balance: { increment: numAmount } },
      });

      // Outflow transaction
      const outTx = await tx.transaction.create({
        data: {
          description: `${description || 'Transferência entre contas'} para ${toAcc.name}`,
          amount: numAmount,
          type: 'expense',
          categoryId: category.id,
          accountId: fromId,
          date: today,
          notes: `Transferência enviada para ${toAcc.name}`,
          userId: user.id,
        },
      });

      // Inflow transaction
      const inTx = await tx.transaction.create({
        data: {
          description: `${description || 'Transferência entre contas'} de ${fromAcc.name}`,
          amount: numAmount,
          type: 'income',
          categoryId: category.id,
          accountId: toId,
          date: today,
          notes: `Transferência recebida de ${fromAcc.name}`,
          userId: user.id,
        },
      });

      return { outTx, inTx };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error during account transfer:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
