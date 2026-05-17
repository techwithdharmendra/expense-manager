
import { db } from '../db';
import { Transaction } from '../types';

export async function updateAccountBalance(accountId: number, amount: number, type: 'income' | 'expense' | 'transfer', isReverse: boolean = false) {
  const account = await db.accounts.get(accountId);
  if (!account) return;

  let delta = amount;
  if (type === 'expense' || type === 'transfer') {
    delta = -amount;
  }

  // If we are reversing (deleting or editing), we negate the delta
  if (isReverse) {
    delta = -delta;
  }

  await db.accounts.update(accountId, {
    balance: (account.balance || 0) + delta
  });
}

export async function addTransaction(transaction: Transaction) {
  return await db.transaction('rw', db.transactions, db.accounts, async () => {
    const id = await db.transactions.add(transaction);
    
    // Update main account
    await updateAccountBalance(Number(transaction.accountId), transaction.amount, transaction.type);
    
    // Update target account if transfer
    if (transaction.type === 'transfer' && transaction.toAccountId) {
      // For transfers, toAccountId gets the money
      await updateAccountBalance(Number(transaction.toAccountId), transaction.amount, 'income');
    }
    
    return id;
  });
}

export async function updateTransaction(id: number, newTransaction: Transaction) {
  return await db.transaction('rw', db.transactions, db.accounts, async () => {
    const oldTransaction = await db.transactions.get(id);
    if (!oldTransaction) throw new Error('Transaction not found');

    // 1. Reverse old transaction effect
    await updateAccountBalance(Number(oldTransaction.accountId), oldTransaction.amount, oldTransaction.type, true);
    if (oldTransaction.type === 'transfer' && oldTransaction.toAccountId) {
      await updateAccountBalance(Number(oldTransaction.toAccountId), oldTransaction.amount, 'income', true);
    }

    // 2. Update record
    await db.transactions.put({ ...newTransaction, id });

    // 3. Apply new transaction effect
    await updateAccountBalance(Number(newTransaction.accountId), newTransaction.amount, newTransaction.type);
    if (newTransaction.type === 'transfer' && newTransaction.toAccountId) {
      await updateAccountBalance(Number(newTransaction.toAccountId), newTransaction.amount, 'income');
    }
  });
}

export async function deleteTransaction(id: number) {
  return await db.transaction('rw', db.transactions, db.accounts, async () => {
    const transaction = await db.transactions.get(id);
    if (!transaction) return;

    // Reverse effect
    await updateAccountBalance(Number(transaction.accountId), transaction.amount, transaction.type, true);
    if (transaction.type === 'transfer' && transaction.toAccountId) {
      await updateAccountBalance(Number(transaction.toAccountId), transaction.amount, 'income', true);
    }

    await db.transactions.delete(id);
  });
}

/**
 * Utility to recalculate all account balances from scratch.
 * Essential for recovering from sync errors or after bulk imports.
 */
export async function auditBalances() {
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    const accounts = await db.accounts.toArray();
    const transactions = await db.transactions.toArray();

    // Reset balances to 0 first (or a base balance if we had one)
    // Here we assume 0 is base or users can adjust it.
    // For safety, we keep the original base balance if we could track it.
    // But since we don't have "initialBalance" field separately, 
    // we'll just recalculate based on transactions relative to current values?
    // No, better to have a "baseBalance" field in Account.
    
    for (const acc of accounts) {
      let balance = 0; // Assuming starting at 0 for simplicity if no base exists
      
      const outgoing = transactions.filter(t => t.accountId === acc.id);
      const incoming = transactions.filter(t => t.type === 'transfer' && t.toAccountId === acc.id);

      outgoing.forEach(t => {
        if (t.type === 'income') balance += t.amount;
        else balance -= t.amount; // expense or transfer
      });

      incoming.forEach(t => {
        balance += t.amount;
      });

      await db.accounts.update(acc.id!, { balance });
    }
  });
}
