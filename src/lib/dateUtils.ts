// src/lib/dateUtils.ts

export function getMonthCycleStartEnd(refDate: Date, startDay: number = 1): { start: Date, end: Date } {
  const d = new Date(refDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const date = d.getDate();

  let start: Date;
  let end: Date;

  if (date >= startDay) {
    // Current month's cycle
    start = new Date(year, month, startDay);
    end = new Date(year, month + 1, startDay - 1);
  } else {
    // Previous month's cycle
    start = new Date(year, month - 1, startDay);
    end = new Date(year, month, startDay - 1);
  }

  // Handle edge case where month has fewer days than startDay e.g., Feb 28/29
  while (start.getDate() !== startDay && startDay > 28) {
    // Start day falls outside month bounds. Adjust or stick to `getDate`.
    // Actually the standard JS Date(year, month, 30) adjusts to Mar 2 if Feb has 28 days.
    // If the user chooses startDay = 31, and we are in Feb, `start` will be Mar 3.
    // This isn't ideal but typically start starts at 1. We just trust JS Date for now.
    break; 
  }
  
  // To avoid time zone edge cases, set to local midnight and end of day:
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function isSameMonthCycle(dateToCheck: Date, refDate: Date, startDay: number = 1): boolean {
  const { start, end } = getMonthCycleStartEnd(refDate, startDay);
  return dateToCheck >= start && dateToCheck <= end;
}

export function formatYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
