
import { db } from '../db';
import { Transaction } from '../types';

export async function processRecurringTransactions() {
  const settings = await db.settings.get(1);
  if (!settings) return;

  const now = new Date();
  const lastProcessed = new Date(settings.lastProcessedRecurring || 0);

  // If we already processed today, skip (to avoid multiple processing on same day if unnecessary)
  // However, for high accuracy, we should check if any intervals have passed since last run.
  
  if (now.toDateString() === lastProcessed.toDateString()) {
    return;
  }

  const recurringTransactions = await db.transactions
    .where('isRecurring')
    .equals(1 as any) // Dexie boolean storage can be tricky, using 1 for true
    .toArray();

  const newTransactions: Transaction[] = [];

  for (const t of recurringTransactions) {
    if (!t.isRecurring || !t.recurringInterval) continue;

    let nextDate = new Date(t.date);
    const interval = t.recurringInterval;

    // Advance nextDate until it's after the last process date but before or on today
    while (true) {
      if (interval === 'daily') nextDate.setDate(nextDate.getDate() + 1);
      else if (interval === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (interval === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (interval === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

      // If the next calculated occurrence is in the future, stop
      if (nextDate > now) break;

      // If the next occurrence is after our last check, add it
      if (nextDate > lastProcessed) {
        const { id: _, ...newT } = t;
        newTransactions.push({
          ...newT,
          date: new Date(nextDate),
          isRecurring: false // The spawned transaction is a normal one
        });
      }
    }
  }

  if (newTransactions.length > 0) {
    await db.transactions.bulkAdd(newTransactions);
    console.log(`Processed ${newTransactions.length} recurring transactions`);
  }

  await db.settings.update(1, { lastProcessedRecurring: now });
}
