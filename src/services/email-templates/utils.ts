import { config } from "../../config";

/**
 * Get time-based greeting
 */
export const getGreetingTime = (): string => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) return "Good Morning";
    if (currentHour < 18) return "Good Afternoon";
    return "Good Evening";
};

export const getUnsubscribeLink = (email: string): string => {
    return `${config.frontendUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
};

/**
 * Generate iCalendar (ICS) string
 */
export const generateICS = (
    eventTitle: string,
    description: string,
    startTime: Date,
    endTime: Date,
    location: string = "Virtual - EventLive",
    organizerName: string = "EventLive",
    organizerEmail: string = "no-reply@eventlive.com"
): string => {
    const formatDate = (date: Date): string => {
        return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const now = formatDate(new Date());
    const start = formatDate(new Date(startTime));
    const end = formatDate(new Date(endTime));

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EventLive//Virtual Events//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${now}-${startTime.getTime()}@eventlive.com
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${eventTitle}
DESCRIPTION:${description}
LOCATION:${location}
ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`.trim();
};
