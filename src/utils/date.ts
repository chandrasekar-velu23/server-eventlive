import { format, toZonedTime } from 'date-fns-tz';

/**
 * Formats a UTC date object into a human-readable string in the specified timezone.
 * 
 * @param date - UTC Date object (from MongoDB)
 * @param timezone - Target timezone (e.g., "Asia/Kolkata")
 * @param formatStr - Optional format string (default: "PPpp" -> Apr 29, 2023, 5:30:00 PM)
 * @returns Formatted date string or original date string if failure
 */
export const formatInTimeZone = (date: Date | string, timezone: string, formatStr: string = "PPpp"): string => {
    try {
        // Fix: Handle HTML encoded timezones (e.g. Asia&#x2F;Kolkata -> Asia/Kolkata)
        const cleanTimezone = timezone.replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');

        const d = typeof date === 'string' ? new Date(date) : date;
        const zonedDate = toZonedTime(d, cleanTimezone);
        return format(zonedDate, formatStr, { timeZone: cleanTimezone });
    } catch (error) {
        console.error(`Error formatting date in timezone: ${timezone}`, error);
        return new Date(date).toLocaleString();
    }
};
