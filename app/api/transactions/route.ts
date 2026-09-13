import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, description, amount, type, categoryId, accountId, date, notes, billId } = body;

    const result = await prisma.$transaction(async (tx) => {
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
    const body = await request.json();
    const { id, description, amount, type, categoryId, accountId, date, notes, billId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findUnique({ where: { id } });
      if (!oldTx) {
        throw new Error('Transaction not found');
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
      const newAccountId = accountId || oldTx.accountId;

      const updated = await tx.transaction.update({
        where: { id },
        data: {
          description: description !== undefined ? description : oldTx.description,
          amount: newAmount,
          type: newType,
          categoryId: categoryId || oldTx.categoryId,
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findUnique({ where: { id } });
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
