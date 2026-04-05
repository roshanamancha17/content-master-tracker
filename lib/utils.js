import { differenceInDays, parseISO, startOfDay, subDays, format } from 'date-fns';

export function getChannelStatus(uploads) {
  if (!uploads || uploads.length === 0) return { days: 0, isSafe: false };

  const today = startOfDay(new Date());
  
  // Convert and filter for today or future dates
  const futureDates = uploads
    .map(d => (typeof d === 'string' ? startOfDay(parseISO(d)) : startOfDay(d)))
    .filter(d => d >= today);

  if (futureDates.length === 0) return { days: 0, isSafe: false };

  const furthestDate = new Date(Math.max(...futureDates.map(d => d.getTime())));
  const diff = differenceInDays(furthestDate, today);

  return {
    days: diff,
    isSafe: diff >= 21 
  };
}

export function getStreak(uploads) {
  if (!uploads || uploads.length === 0) return 0;
  let streak = 0;
  let checkDate = subDays(new Date(), 1); 
  const uploadSet = new Set(uploads);

  while (uploadSet.has(format(checkDate, 'yyyy-MM-dd'))) {
    streak++;
    checkDate = subDays(checkDate, 1);
  }

  if (uploadSet.has(format(new Date(), 'yyyy-MM-dd'))) {
    streak++;
  }
  return streak;
}