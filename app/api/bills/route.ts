import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      amount,
      dueDate,
      categoryId,
      status,
      accountId,
      recipient,
      barcode,
      notes,
      paidAt,
      isRecurring,
      recurrencePeriod,
    } = body;

    const bill = await prisma.bill.create({
      data: {
        id: id || undefined,
        title,
        amount: Number(amount),
        dueDate,
        categoryId,
        status: status || 'pending',
        accountId: accountId || null,
        recipient: recipient || null,
        barcode: barcode || null,
        notes: notes || null,
        paidAt: paidAt || null,
        isRecurring: Boolean(isRecurring),
        recurrencePeriod: recurrencePeriod || null,
      },
    });

    return NextResponse.json({ success: true, bill });
  } catch (error) {
    console.error('Error creating bill:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, action, accountId, paidDate, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    if (action === 'pay') {
      const result = await prisma.$transaction(async (tx) => {
        const bill = await tx.bill.findUnique({ where: { id } });
        if (!bill) throw new Error('Bill not found');

        const actualPaidDate = paidDate || new Date().toISOString().split('T')[0];
        const updatedBill = await tx.bill.update({
          where: { id },
          data: {
            status: 'paid',
            paidAt: actualPaidDate,
            accountId: accountId || bill.accountId,
          },
        });

        // Create linked expense transaction
        const targetAccountId = accountId || bill.accountId;
        if (targetAccountId) {
          await tx.transaction.create({
            data: {
              description: `Pagamento: ${bill.title}`,
              amount: bill.amount,
              type: 'expense',
              categoryId: bill.categoryId,
              accountId: targetAccountId,
              date: actualPaidDate,
              billId: bill.id,
              notes: bill.recipient ? `Favorecido: ${bill.recipient}` : undefined,
            },
          });

          await tx.account.update({
            where: { id: targetAccountId },
            data: {
              balance: { decrement: bill.amount },
            },
          });
        }

        return updatedBill;
      });

      return NextResponse.json({ success: true, bill: result });
    }

    if (action === 'unpay') {
      const result = await prisma.$transaction(async (tx) => {
        const bill = await tx.bill.findUnique({ where: { id } });
        if (!bill) throw new Error('Bill not found');

        // Find linked transactions
        const linkedTransactions = await tx.transaction.findMany({
          where: { billId: id },
        });

        for (const linkedTx of linkedTransactions) {
          await tx.account.update({
            where: { id: linkedTx.accountId },
            data: {
              balance: { increment: linkedTx.amount },
            },
          });
          await tx.transaction.delete({ where: { id: linkedTx.id } });
        }

        const nowStr = new Date().toISOString().split('T')[0];
        const newStatus = bill.dueDate < nowStr ? 'overdue' : 'pending';

        const updatedBill = await tx.bill.update({
          where: { id },
          data: {
            status: newStatus,
            paidAt: null,
          },
        });

        return updatedBill;
      });

      return NextResponse.json({ success: true, bill: result });
    }

    // Regular update
    const updatedBill = await prisma.bill.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.amount !== undefined && { amount: Number(data.amount) }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.accountId !== undefined && { accountId: data.accountId }),
        ...(data.recipient !== undefined && { recipient: data.recipient }),
        ...(data.barcode !== undefined && { barcode: data.barcode }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.paidAt !== undefined && { paidAt: data.paidAt }),
        ...(data.isRecurring !== undefined && { isRecurring: Boolean(data.isRecurring) }),
        ...(data.recurrencePeriod !== undefined && { recurrencePeriod: data.recurrencePeriod }),
      },
    });

    return NextResponse.json({ success: true, bill: updatedBill });
  } catch (error) {
    console.error('Error updating bill:', error);
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
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    await prisma.bill.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
