import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromId, toId, amount, description } = body;

    const numAmount = Number(amount);
    if (!fromId || !toId || numAmount <= 0) {
      return NextResponse.json({ error: 'Parâmetros de transferência inválidos' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const result = await prisma.$transaction(async (tx) => {
      const fromAcc = await tx.account.findUnique({ where: { id: fromId } });
      const toAcc = await tx.account.findUnique({ where: { id: toId } });

      if (!fromAcc || !toAcc) {
        throw new Error('Uma ou ambas as contas não foram encontradas');
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
          categoryId: 'cat-outros',
          accountId: fromId,
          date: today,
          notes: `Transferência enviada para ${toAcc.name}`,
        },
      });

      // Inflow transaction
      const inTx = await tx.transaction.create({
        data: {
          description: `${description || 'Transferência entre contas'} de ${fromAcc.name}`,
          amount: numAmount,
          type: 'income',
          categoryId: 'cat-outros',
          accountId: toId,
          date: today,
          notes: `Transferência recebida de ${fromAcc.name}`,
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
