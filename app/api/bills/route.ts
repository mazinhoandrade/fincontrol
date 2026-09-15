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

    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: user.id },
    });
    if (!category) {
      return NextResponse.json({ error: 'Categoria inválida ou não encontrada' }, { status: 400 });
    }

    // Verify account belongs to user if provided
    if (accountId) {
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId: user.id },
      });
      if (!account) {
        return NextResponse.json({ error: 'Conta bancária inválida ou não encontrada' }, { status: 400 });
      }
    }

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
        userId: user.id,
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, action, accountId, paidDate, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    const existingBill = await prisma.bill.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingBill) {
      return NextResponse.json({ error: 'Conta não encontrada ou acesso não permitido' }, { status: 404 });
    }

    if (action === 'pay') {
      const result = await prisma.$transaction(async (tx: any) => {
        const bill = await tx.bill.findFirst({ where: { id, userId: user.id } });
        if (!bill) throw new Error('Conta a pagar não encontrada');

        const actualPaidDate = paidDate || new Date().toISOString().split('T')[0];
        const targetAccountId = accountId || bill.accountId;

        if (targetAccountId) {
          const account = await tx.account.findFirst({
            where: { id: targetAccountId, userId: user.id },
          });
          if (!account) {
            throw new Error('Conta bancária selecionada não pertence ao usuário');
          }

          // Create linked expense transaction
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
              userId: user.id,
            },
          });

          await tx.account.update({
            where: { id: targetAccountId },
            data: {
              balance: { decrement: bill.amount },
            },
          });
        }

        const updatedBill = await tx.bill.update({
          where: { id },
          data: {
            status: 'paid',
            paidAt: actualPaidDate,
            accountId: targetAccountId || bill.accountId,
          },
        });

        return updatedBill;
      });

      return NextResponse.json({ success: true, bill: result });
    }

    if (action === 'unpay') {
      const result = await prisma.$transaction(async (tx: any) => {
        const bill = await tx.bill.findFirst({ where: { id, userId: user.id } });
        if (!bill) throw new Error('Conta a pagar não encontrada');

        // Find linked transactions belonging to this user
        const linkedTransactions = await tx.transaction.findMany({
          where: { billId: id, userId: user.id },
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

    // Verify new category if provided
    if (data.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: data.categoryId, userId: user.id },
      });
      if (!cat) {
        return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 });
      }
    }

    // Verify new account if provided
    if (data.accountId) {
      const acc = await prisma.account.findFirst({
        where: { id: data.accountId, userId: user.id },
      });
      if (!acc) {
        return NextResponse.json({ error: 'Conta inválida' }, { status: 400 });
      }
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    const existingBill = await prisma.bill.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingBill) {
      return NextResponse.json({ error: 'Conta não encontrada ou acesso não permitido' }, { status: 404 });
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
