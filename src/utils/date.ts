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
        let cleanTimezone = timezone;

        // Iteratively decode to handle double encoding
        // e.g., "Asia&amp;#x2F;Calcutta" -> "Asia&#x2F;Calcutta" -> "Asia/Calcutta"
        let previous;
        let attempts = 0;
        do {
            previous = cleanTimezone;
            cleanTimezone = decodeURIComponent(cleanTimezone);
            cleanTimezone = cleanTimezone
                .replace(/&amp;/g, '&')
                .replace(/&#x2F;/g, '/')
                .replace(/&#x27;/g, "'")
                .replace(/&quot;/g, '"');
            attempts++;
        } while (cleanTimezone !== previous && attempts < 5);


        const d = typeof date === 'string' ? new Date(date) : date;
        const zonedDate = toZonedTime(d, cleanTimezone);
        return format(zonedDate, formatStr, { timeZone: cleanTimezone });
    } catch (error) {
        console.error(`Error formatting date in timezone: ${timezone}`, error);
        return new Date(date).toLocaleString();
    }
};
