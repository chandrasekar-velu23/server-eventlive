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
        const d = typeof date === 'string' ? new Date(date) : date;
        // toZonedTime returns a Date instance representing the time in the zone (it shifts the hours)
        // format from date-fns-tz handles the actual formatting with timezone awareness if needed,
        // but typically we pass the zoned date to format.
        const zonedDate = toZonedTime(d, timezone);
        return format(zonedDate, formatStr, { timeZone: timezone });
    } catch (error) {
        console.error("Error formatting date in timezone:", error);
        return new Date(date).toLocaleString();
    }
};
