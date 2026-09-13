import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  initialAccounts,
  initialBills,
  initialCategories,
  initialTransactions,
} from '@/lib/initialData';

export async function GET() {
  try {
    let [categories, accounts, bills, transactions, readNotifs] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
      prisma.account.findMany({ orderBy: { name: 'asc' } }),
      prisma.bill.findMany({ orderBy: { dueDate: 'asc' } }),
      prisma.transaction.findMany({ orderBy: { date: 'desc' } }),
      prisma.readNotification.findMany(),
    ]);

    // If database is completely empty (e.g. initial setup), auto-seed from initialData
    if (categories.length === 0 && accounts.length === 0) {
      for (const cat of initialCategories) {
        await prisma.category.upsert({
          where: { id: cat.id },
          update: {},
          create: {
            id: cat.id,
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
          },
        });
      }

      for (const acc of initialAccounts) {
        await prisma.account.upsert({
          where: { id: acc.id },
          update: {},
          create: {
            id: acc.id,
            name: acc.name,
            type: acc.type,
            balance: acc.balance,
            institution: acc.institution,
            color: acc.color,
            icon: acc.icon,
            accountNumber: acc.accountNumber,
          },
        });
      }

      for (const bill of initialBills) {
        await prisma.bill.upsert({
          where: { id: bill.id },
          update: {},
          create: {
            id: bill.id,
            title: bill.title,
            amount: bill.amount,
            dueDate: bill.dueDate,
            categoryId: bill.categoryId,
            status: bill.status,
            accountId: bill.accountId,
            recipient: bill.recipient,
            barcode: bill.barcode,
            notes: bill.notes,
            paidAt: bill.paidAt,
            isRecurring: bill.isRecurring,
            recurrencePeriod: bill.recurrencePeriod,
          },
        });
      }

      for (const tx of initialTransactions) {
        await prisma.transaction.upsert({
          where: { id: tx.id },
          update: {},
          create: {
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            categoryId: tx.categoryId,
            accountId: tx.accountId,
            date: tx.date,
            notes: tx.notes,
            billId: tx.billId,
          },
        });
      }

      [categories, accounts, bills, transactions] = await Promise.all([
        prisma.category.findMany({ orderBy: { name: 'asc' } }),
        prisma.account.findMany({ orderBy: { name: 'asc' } }),
        prisma.bill.findMany({ orderBy: { dueDate: 'asc' } }),
        prisma.transaction.findMany({ orderBy: { date: 'desc' } }),
      ]);
    }

    return NextResponse.json({
      success: true,
      source: 'neondb',
      accounts,
      transactions,
      bills,
      categories,
      readNotifIds: readNotifs.map((n: { id: string }) => n.id),
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
    const body = await request.json();
    if (body.action === 'reset') {
      // Clear existing records
      await prisma.transaction.deleteMany();
      await prisma.bill.deleteMany();
      await prisma.account.deleteMany();
      await prisma.category.deleteMany();
      await prisma.readNotification.deleteMany();

      // Seed fresh initial data
      for (const cat of initialCategories) {
        await prisma.category.create({
          data: {
            id: cat.id,
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
          },
        });
      }

      for (const acc of initialAccounts) {
        await prisma.account.create({
          data: {
            id: acc.id,
            name: acc.name,
            type: acc.type,
            balance: acc.balance,
            institution: acc.institution,
            color: acc.color,
            icon: acc.icon,
            accountNumber: acc.accountNumber,
          },
        });
      }

      for (const bill of initialBills) {
        await prisma.bill.create({
          data: {
            id: bill.id,
            title: bill.title,
            amount: bill.amount,
            dueDate: bill.dueDate,
            categoryId: bill.categoryId,
            status: bill.status,
            accountId: bill.accountId,
            recipient: bill.recipient,
            barcode: bill.barcode,
            notes: bill.notes,
            paidAt: bill.paidAt,
            isRecurring: bill.isRecurring,
            recurrencePeriod: bill.recurrencePeriod,
          },
        });
      }

      for (const tx of initialTransactions) {
        await prisma.transaction.create({
          data: {
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            categoryId: tx.categoryId,
            accountId: tx.accountId,
            date: tx.date,
            notes: tx.notes,
            billId: tx.billId,
          },
        });
      }

      const [categories, accounts, bills, transactions] = await Promise.all([
        prisma.category.findMany({ orderBy: { name: 'asc' } }),
        prisma.account.findMany({ orderBy: { name: 'asc' } }),
        prisma.bill.findMany({ orderBy: { dueDate: 'asc' } }),
        prisma.transaction.findMany({ orderBy: { date: 'desc' } }),
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
