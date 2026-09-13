import { PrismaClient } from '@prisma/client';
import {
  initialAccounts,
  initialBills,
  initialCategories,
  initialTransactions,
} from '../lib/initialData';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with initial data...');

  // Seed Categories
  for (const cat of initialCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
      },
      create: {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
      },
    });
  }
  console.log(`✓ Categories seeded (${initialCategories.length})`);

  // Seed Accounts
  for (const acc of initialAccounts) {
    await prisma.account.upsert({
      where: { id: acc.id },
      update: {
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
        institution: acc.institution,
        color: acc.color,
        icon: acc.icon,
        accountNumber: acc.accountNumber,
      },
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
  console.log(`✓ Accounts seeded (${initialAccounts.length})`);

  // Seed Bills
  for (const bill of initialBills) {
    await prisma.bill.upsert({
      where: { id: bill.id },
      update: {
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
  console.log(`✓ Bills seeded (${initialBills.length})`);

  // Seed Transactions
  for (const tx of initialTransactions) {
    await prisma.transaction.upsert({
      where: { id: tx.id },
      update: {
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        categoryId: tx.categoryId,
        accountId: tx.accountId,
        date: tx.date,
        notes: tx.notes,
        billId: tx.billId,
      },
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
  console.log(`✓ Transactions seeded (${initialTransactions.length})`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
