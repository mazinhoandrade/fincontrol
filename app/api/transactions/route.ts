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
    const { id, description, amount, type, categoryId, accountId, date, notes, billId } = body;

    // Verify category and account ownership
    const [category, account] = await Promise.all([
      prisma.category.findFirst({ where: { id: categoryId, userId: user.id } }),
      prisma.account.findFirst({ where: { id: accountId, userId: user.id } }),
    ]);

    if (!category || !account) {
      return NextResponse.json(
        { error: 'Categoria ou conta bancária inválida ou não pertencente ao usuário' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const transaction = await tx.transaction.create({
        data: {
          id: id || undefined,
          description,
          amount: Number(amount),
          type,
          categoryId,
          accountId,
          date,
          notes,
          billId: billId || null,
          userId: user.id,
        },
      });

      const delta = type === 'income' ? Number(amount) : -Number(amount);
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { increment: delta },
        },
      });

      return transaction;
    });

    return NextResponse.json({ success: true, transaction: result });
  } catch (error) {
    console.error('Error creating transaction:', error);
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
    const { id, description, amount, type, categoryId, accountId, date, notes, billId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const oldTx = await tx.transaction.findFirst({
        where: { id, userId: user.id },
      });
      if (!oldTx) {
        throw new Error('Transação não encontrada ou não permitida');
      }

      const newAccountId = accountId || oldTx.accountId;
      const newCategoryId = categoryId || oldTx.categoryId;

      // Verify destination account if changed
      if (accountId && accountId !== oldTx.accountId) {
        const acc = await tx.account.findFirst({ where: { id: accountId, userId: user.id } });
        if (!acc) throw new Error('Conta bancária de destino inválida');
      }

      // Verify category if changed
      if (categoryId && categoryId !== oldTx.categoryId) {
        const cat = await tx.category.findFirst({ where: { id: categoryId, userId: user.id } });
        if (!cat) throw new Error('Categoria inválida');
      }

      // Revert old transaction impact on account balance
      const oldDelta = oldTx.type === 'income' ? oldTx.amount : -oldTx.amount;
      await tx.account.update({
        where: { id: oldTx.accountId },
        data: {
          balance: { decrement: oldDelta },
        },
      });

      // Update the transaction
      const newAmount = amount !== undefined ? Number(amount) : oldTx.amount;
      const newType = type || oldTx.type;

      const updated = await tx.transaction.update({
        where: { id },
        data: {
          description: description !== undefined ? description : oldTx.description,
          amount: newAmount,
          type: newType,
          categoryId: newCategoryId,
          accountId: newAccountId,
          date: date || oldTx.date,
          notes: notes !== undefined ? notes : oldTx.notes,
          billId: billId !== undefined ? billId : oldTx.billId,
        },
      });

      // Apply new transaction impact on account balance
      const newDelta = newType === 'income' ? newAmount : -newAmount;
      await tx.account.update({
        where: { id: newAccountId },
        data: {
          balance: { increment: newDelta },
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, transaction: result });
  } catch (error) {
    console.error('Error updating transaction:', error);
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
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    await prisma.$transaction(async (tx: any) => {
      const oldTx = await tx.transaction.findFirst({
        where: { id, userId: user.id },
      });
      if (!oldTx) return;

      // Revert account balance
      const delta = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
      await tx.account.update({
        where: { id: oldTx.accountId },
        data: {
          balance: { increment: delta },
        },
      });

      await tx.transaction.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
