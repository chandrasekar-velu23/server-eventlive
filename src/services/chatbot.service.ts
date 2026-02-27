import axios, { AxiosError } from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// OpenRouter Configuration
// ─────────────────────────────────────────────────────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-5-chat";

if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "your_openrouter_api_key_here") {
    console.warn("[ChatBot] OPENROUTER_API_KEY not set — AI fallback disabled.");
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatReply {
    reply: string;
    suggestions: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE GUIDES
// Updated: Professional tone (no emojis) and response-specific suggestions.
// ─────────────────────────────────────────────────────────────────────────────
const FEATURE_GUIDES: Record<string, { roles?: string[]; answer: string; suggestions: string[] }> = {
    create_event: {
        roles: ["Organizer"],
        answer: "**How to Create an Event**\n\n1. Sidebar → **Create Event**\n2. **Details** — Title, Description, Category, Event Type (Virtual / In-Person / Hybrid), Banner image\n3. **Schedule** — Start & end date/time, Timezone, Duration\n4. **Speakers** — Add name, bio, photo, social links\n5. **Registration** — Max capacity, Ticket type (Free/Paid), Deadline\n6. **Review** — Final check → **Publish** to go live, or **Save as Draft** to continue later\n\nYou can jump back to any step before publishing.",
        suggestions: ["How do I add a speaker?", "Can I save as draft?", "How to publish my event?"],
    },
    create_event_guest: {
        roles: ["Attendee", "Guest"],
        answer: "Creating events is an Organizer feature.\n\nTo become an Organizer:\n1. Sign up at /get-started\n2. During Onboarding, choose Organizer\n3. Access the Dashboard → Create Event",
        suggestions: ["How do I sign up?", "What is an Organizer?", "Can I browse events?"],
    },
    publish_event: {
        roles: ["Organizer"],
        answer: "**How to Publish an Event**\n\n**Option A — during creation:**\n- Create Event wizard → Step 5 (Review) → **Publish**\n\n**Option B — from Drafts:**\n1. Sidebar → **Drafts** → click the draft\n2. Step 5 (Review) → **Publish**\n\n**Option C — from My Events:**\n1. Sidebar → **My Events** → click the draft\n2. Edit → Review → **Publish**\n\nOnce published, attendees can discover and register for the event.",
        suggestions: ["How to manage attendees?", "How to start a live session?", "Can I cancel an event?"],
    },
    save_draft: {
        roles: ["Organizer"],
        answer: "**How to Save as Draft**\n\nDuring the Create Event wizard (any step):\n- Click **Save as Draft**\n\n**To resume:**\n1. Sidebar → **Drafts**\n2. Click the draft → continue from where you left off",
        suggestions: ["How to publish my event?", "Can I delete a draft?", "How to add a speaker?"],
    },
    add_speaker: {
        roles: ["Organizer"],
        answer: "**How to Add a Speaker** (Step 3 of Create Event)\n\n1. Click **+ Add Speaker**\n2. Fill in: Name, Role/Title, Bio, Photo (upload), social links (optional)\n3. Click **Save Speaker**\n4. Repeat for additional speakers\n\nSpeakers will be displayed on the event page for attendees to view.",
        suggestions: ["How to create an event?", "How to manage attendees?", "How to start a session?"],
    },
    start_session: {
        roles: ["Organizer"],
        answer: "**How to Start a Live Session**\n\n1. Sidebar → **My Events**\n2. Click your published event → **Manage Event**\n3. Click **Start Live Session**\n4. A session code and shareable link will be generated\n5. Share the code with attendees who can join at /join/[code]\n\nEnsure your microphone and camera are tested before starting.",
        suggestions: ["How to record a session?", "Host controls overview", "How to manage attendees?"],
    },
    join_session: {
        answer: "**How to Join a Live Session**\n\n1. Obtain the **session code** from the organizer\n2. Navigate to /join/[code] in your browser, or click the link shared by the organizer\n3. Wait in the **Event Lobby** until the session begins\n4. You will enter the session automatically when it starts\n\nPlease allow browser camera and microphone permissions when prompted.",
        suggestions: ["How to raise my hand?", "How to use the chat?", "Lobby overview"],
    },
    raise_hand: {
        roles: ["Attendee"],
        answer: "**How to Raise Your Hand**\n\n1. During a live session, select the **Raise Hand** button in the bottom control bar\n2. The organizer will see your request\n3. Wait for the organizer to acknowledge you\n4. Select **Lower Hand** when finished\n\nYou can also use the **Q&A panel** or **Chat** to submit questions.",
        suggestions: ["How to use the chat?", "How to join a session?", "Attendee controls"],
    },
    record_session: {
        roles: ["Organizer"],
        answer: "**How to Record a Session** (Organizer only)\n\n1. During the live session, click **Start Recording** in the host controls\n2. Attendees will see a Recording indicator\n3. When finished, click **Stop Recording**\n4. The file will download automatically (WebM format)\n\nYou can share the recording with your attendees after the event.",
        suggestions: ["Host controls overview", "How to end a session?", "Where is the recording?"],
    },
    manage_attendees: {
        roles: ["Organizer"],
        answer: "**How to Manage Attendees**\n\n**All events:**\n- Sidebar → **Attendees**\n\n**Specific event:**\n1. Sidebar → **My Events** → click event → **Manage Event**\n2. Navigate to the **Attendees** tab\n\nYou can search by name or email, and view registration dates and status.",
        suggestions: ["How to approve requests?", "How to create an event?", "View event analytics"],
    },
    approve_requests: {
        roles: ["Organizer"],
        answer: "**How to Handle Join Requests**\n\n1. Sidebar → **Requests**\n2. Review pending requests with attendee details\n3. Click **Approve** or **Reject**\n\nApproved attendees are notified automatically.",
        suggestions: ["How to manage attendees?", "How to create an event?", "Notification settings"],
    },
    update_profile: {
        answer: "**How to Update Your Profile**\n\n1. Sidebar → **Settings**\n2. Edit: Name, Bio, Avatar photo, Social links\n3. Click **Save Changes**\n\n**To change password:**\n- Settings → Security → **Change Password**\n- Enter current and new password → Save",
        suggestions: ["How to reset password?", "Change notification settings", "Update organization info"],
    },
    forgot_password: {
        answer: "**How to Reset Your Password**\n\n1. Login page → **Forgot Password**\n2. Enter your registered email\n3. Check your inbox for a reset email (check spam if not found)\n4. Click the link and enter a new password\n\nReset links expire after 1 hour.",
        suggestions: ["How to log in?", "Contact support", "Update profile"],
    },
    enroll_event: {
        roles: ["Attendee", "Guest"],
        answer: "**How to Register for an Event**\n\n1. Sidebar → **All Events**\n2. Find an event and click its card\n3. Click **Register** or **Enroll**\n   - Free → instant enrollment\n   - Paid → complete payment\n   - Invite-only → submit a join request\n4. The event will appear in your **Enrolled Events**\n\nYou will receive a confirmation email.",
        suggestions: ["How to join a session?", "Where are my events?", "Find upcoming events"],
    },
    cancel_event: {
        roles: ["Organizer"],
        answer: "**How to Cancel an Event**\n\n1. Sidebar → **My Events** → click the event\n2. **Manage Event** → **Cancel Event** (at the bottom)\n3. Confirm the cancellation\n\nCancellation is permanent. Registered attendees will be notified.",
        suggestions: ["How to create an event?", "How to publish an event?", "Manage attendees"],
    },
    status_badges: {
        answer: "**Event Status Badges**\n\n| Status | Meaning |\n|---|---|\n| **Draft** | Not yet published |\n| **Published** | Live for registration |\n| **Upcoming** | Registration open, session not started |\n| **Live** | Session in progress |\n| **Ended** | Session finished |\n| **Cancelled** | Cancelled by the organizer |",
        suggestions: ["How to publish an event?", "How to create an event?", "Start a live session"],
    },
    platform_overview: {
        answer: "**What is EventLive?**\n\nEventLive is a virtual event platform connecting organizers with their audiences.\n\n**Organizers** — Create events, host live sessions, manage attendees, view analytics\n**Attendees** — Discover events, register, join live sessions, interact in real-time\n\nKey features include: Live video/audio, Chat, Q&A, Live polls, Session recording, Attendee management, and Analytics.",
        suggestions: ["What are the roles?", "Key features list", "Pricing info"],
    },
    roles_info: {
        answer: "**EventLive Roles**\n\n**Organizer**\n- Create and manage events (5-step wizard)\n- Host and record live sessions\n- Manage speakers and attendees\n- Handle join requests and view analytics\n\n**Attendee**\n- Browse and register for events\n- Join live sessions via code\n- Participate via chat, Q&A, polls, and raising hands\n\nRole selection occurs during the Onboarding process.",
        suggestions: ["How to choose a role?", "Organizer features", "Attendee features"],
    },
    dashboard_overview: {
        answer: "**Your Dashboard Overview**\n\n**Stats** — Total Events, Total Attendees, Live Now, Engagement Rate\n**Upcoming Events** — Your next scheduled events\n**Recent Activity** — Platform logs\n**Quick Actions** — Create Event, Manage Events, View Attendees, Settings\n\nNavigate using the left sidebar to access all platform sections.",
        suggestions: ["How to create an event?", "Where are my settings?", "Manage my events"],
    },
    session_controls: {
        roles: ["Attendee"],
        answer: "**Live Session Controls (Attendee)**\n\n- **Mute/Unmute** — Toggle microphone\n- **Camera** — Toggle video\n- **Raise Hand** — Signal to speak\n- **Chat** — Real-time messaging\n- **Q&A** — Submit questions\n- **Polls** — Respond to live polls\n- **Participants** — View current attendees",
        suggestions: ["How to raise my hand?", "How to use chat?", "Wait in lobby"],
    },
    session_controls_org: {
        roles: ["Organizer"],
        answer: "**Live Session Host Controls**\n\nIncludes all attendee controls plus:\n- **Start/Stop Recording**\n- **Mute Participants**\n- **Create Poll** — Launch a live poll\n- **End Session** — End the event for everyone\n\nShare your session code or link before starting.",
        suggestions: ["How to record a session?", "How to mute others?", "End session overview"],
    },
    getting_started: {
        roles: ["Guest"],
        answer: "**Getting Started with EventLive**\n\n1. Select **Get Started** on the homepage\n2. Enter your name, email, and password\n3. Verify your email address\n4. Choose your role during Onboarding:\n   - **Organizer** to create and manage events\n   - **Attendee** to discover and join events\n5. Access your personalized Dashboard",
        suggestions: ["How to sign up?", "What is an Organizer?", "How to join an event"],
    },
    lobby: {
        answer: "**Event Lobby**\n\nThe Event Lobby is a waiting room before the live session starts.\n\n- The organizer controls when the session begins\n- You will enter the live session automatically when it starts\n- While waiting, you can view event details and other participants\n\nEnsure your microphone and camera settings are configured correctly.",
        suggestions: ["How to join a session?", "Session controls", "Attendee features"],
    },
    login: {
        answer: "**How to Log In**\n\n1. Navigate to the **Login** page\n2. Enter your email and password, then select **Sign In**\n   — OR — select **Continue with Google** for one-click authentication\n3. You will be redirected to your Dashboard\n\nIf you have forgotten your password, select **Forgot Password** on the login page.",
        suggestions: ["Forgot password?", "How to sign up?", "Profile settings"],
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL INTENT ROUTER
// ─────────────────────────────────────────────────────────────────────────────
interface IntentRule {
    keywords: string[];
    guide?: string;
    answer?: string;
    suggestions?: string[];
    roles?: string[];
}

const INTENT_RULES: IntentRule[] = [
    { keywords: ["create event", "new event", "make event", "host event", "add event", "how do i create", "want to create", "build event"], guide: "create_event", roles: ["Organizer"] },
    { keywords: ["create event", "make event", "host event"], guide: "create_event_guest", roles: ["Attendee", "Guest"] },
    { keywords: ["publish event", "how to publish", "make event live", "go live with event", "publish my event", "set event live"], guide: "publish_event" },
    { keywords: ["save draft", "draft event", "continue draft", "resume draft", "save as draft", "come back later", "finish later", "where are my drafts"], guide: "save_draft" },
    { keywords: ["add speaker", "speaker step", "speaker bio", "speaker photo", "manage speaker", "remove speaker", "edit speaker", "speaker details"], guide: "add_speaker" },
    { keywords: ["start session", "start live session", "begin session", "launch session", "host session", "go live now", "how do i go live"], guide: "start_session", roles: ["Organizer"] },
    { keywords: ["join session", "join a session", "join code", "how to join", "enter code", "session code", "join the event", "join live"], guide: "join_session" },
    { keywords: ["raise hand", "raise my hand", "get attention", "signal organizer", "how to talk", "unmute myself", "how to speak"], guide: "raise_hand" },
    { keywords: ["record session", "recording", "record the event", "stop recording", "start recording", "save session video", "download recording"], guide: "record_session" },
    { keywords: ["view attendees", "manage attendees", "attendee list", "who registered", "see attendees", "attendee details", "registered users", "list of attendees"], guide: "manage_attendees" },
    { keywords: ["approve request", "reject request", "join request", "pending request", "manage request", "accept attendee", "deny attendee"], guide: "approve_requests" },
    { keywords: ["update profile", "edit profile", "change avatar", "profile settings", "change profile photo", "upload photo", "update my name", "change my name", "profile picture", "update bio", "edit bio"], guide: "update_profile" },
    { keywords: ["change password", "update password", "new password", "reset my password", "my password"], guide: "update_profile" },
    { keywords: ["forgot password", "reset password", "can't log in", "cant log in", "lost password", "recover account", "password reset", "didn't receive reset", "reset link"], guide: "forgot_password" },
    { keywords: ["register for event", "enroll event", "how to join event", "sign up for event", "attend event", "how do i register", "enroll in", "enrol"], guide: "enroll_event" },
    { keywords: ["cancel event", "delete event", "remove event", "cancel my event", "how to cancel"], guide: "cancel_event" },
    { keywords: ["status badge", "event status", "what does status mean", "draft vs published", "what is upcoming", "what is live status", "what do the statuses mean", "status meanings"], guide: "status_badges" },
    { keywords: ["what is eventlive", "about eventlive", "platform overview", "eventlive features", "how does eventlive work", "tell me about eventlive", "what does eventlive do"], guide: "platform_overview" },
    { keywords: ["organizer vs attendee", "what is organizer", "what is attendee", "which role", "roles in eventlive", "difference between roles", "organizer or attendee", "what role", "change my role"], guide: "roles_info" },
    { keywords: ["what is dashboard", "dashboard overview", "what can i see on dashboard", "dashboard features", "what can i do here", "this page", "how to use dashboard"], guide: "dashboard_overview" },
    { keywords: ["mute my mic", "turn off camera", "session controls", "what can i do in session", "controls during session", "in session features", "session features"], guide: "session_controls", roles: ["Attendee", "Guest"] },
    { keywords: ["host controls", "mute attendees", "end session", "create poll", "organizer controls", "end the session", "close session", "stop session"], guide: "session_controls_org", roles: ["Organizer"] },
    { keywords: ["how to sign up", "create account", "get started", "new account", "register account", "sign up", "join eventlive", "how do i join", "i'm new"], guide: "getting_started", roles: ["Guest"] },
    { keywords: ["q&a", "qa panel", "ask question", "submit question", "how to ask organizer"], guide: "raise_hand" },
    { keywords: ["live poll", "how to vote", "respond to poll", "poll in session", "answer poll"], guide: "session_controls", roles: ["Attendee"] },
    { keywords: ["create poll", "launch poll", "add poll"], guide: "session_controls_org", roles: ["Organizer"] },
    { keywords: ["enrolled events", "my enrolled", "events i joined", "where are my events", "find my events", "events i registered"], guide: "enroll_event" },
    { keywords: ["screen share", "share screen", "share my screen", "share display"], guide: "session_controls" },
    { keywords: ["chat in session", "send message", "text chat", "messaging in session", "how to chat"], guide: "session_controls" },
    { keywords: ["ticket type", "paid event", "free event", "ticket price", "registration type", "is it free"], guide: "create_event", roles: ["Organizer"] },
    { keywords: ["virtual event", "in-person event", "hybrid event", "event type", "online event"], guide: "create_event", roles: ["Organizer"] },
    { keywords: ["event lobby", "waiting room", "before session", "waiting for event", "lobby"], guide: "lobby" },
    { keywords: ["notification", "email notification", "alert settings", "email settings"], guide: "update_profile" },
    { keywords: ["how to login", "how to sign in", "log in", "login with google", "google sign in"], guide: "login" },
    { keywords: ["max capacity", "event capacity", "how many attendees", "attendee limit", "maximum attendees"], guide: "create_event", roles: ["Organizer"] },
];

function detectLocalIntent(message: string, role: string): ChatReply | null {
    const lower = message.toLowerCase();

    for (const rule of INTENT_RULES) {
        const matched = rule.keywords.some((kw) => lower.includes(kw));
        if (!matched) continue;

        if (rule.roles && !rule.roles.includes(role)) continue;

        if (rule.answer) {
            return { reply: rule.answer, suggestions: rule.suggestions || ["Tell me more", "Back to dashboard"] };
        }

        if (!rule.guide) continue;
        const guide = FEATURE_GUIDES[rule.guide];
        if (!guide) continue;

        if (guide.roles && !guide.roles.includes(role)) {
            const fallback = FEATURE_GUIDES[rule.guide + "_guest"];
            if (fallback) return { reply: fallback.answer, suggestions: fallback.suggestions };
            continue;
        }

        return { reply: guide.answer, suggestions: guide.suggestions };
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE CONTEXT MAP
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_CONTEXTS: Record<string, string> = {
    "/": "Public landing page with platform overview and sign-up/login CTAs.",
    "/login": "Login page for email or Google authentication.",
    "/get-started": "Sign Up page for new users.",
    "/onboarding": "Role selection for Organizer or Attendee.",
    "/forgot-password": "Account recovery page.",
    "/all-events": "Public browsing for all events.",
    "/dashboard": "Organizer/Attendee dashboard home.",
    "/dashboard/create-event": "Event creation walkthrough.",
    "/dashboard/events": "Management of created events.",
    "/dashboard/drafts": "Unpublished event drafts.",
    "/dashboard/requests": "Join request management.",
    "/dashboard/attendees": "Consolidated attendee overview.",
    "/dashboard/all-events": "Event discovery from dashboard.",
    "/dashboard/enrolled": "Events user is registered for.",
    "/dashboard/settings": "Account and profile configuration.",
    "/dashboard/events/:id": "Detailed event management.",
    "/dashboard/events/:id/attendees": "Event-specific registration list.",
    "/join/:code": "Live session interface.",
    "/event-lobby": "Pre-session waiting area.",
};

function normalizePage(page: string): string {
    if (/^\/dashboard\/events\/[^/]+\/attendees/.test(page)) return "/dashboard/events/:id/attendees";
    if (/^\/dashboard\/events\/[^/]+/.test(page)) return "/dashboard/events/:id";
    if (/^\/join\//.test(page)) return "/join/:code";
    return page;
}

function getRoleContext(role: string): string {
    if (role === "Organizer") return "ORGANIZER: Can create/manage events, attendees, and live sessions. Focus on management capabilities.";
    if (role === "Attendee") return "ATTENDEE: Can browse, register, and join sessions. Focus on participation features.";
    return "GUEST: Not logged in. Guide towards registration or login.";
}

// ─────────────────────────────────────────────────────────────────────────────
// AI FALLBACK
// ─────────────────────────────────────────────────────────────────────────────
interface OpenRouterResponse {
    choices: { message: { content: string }; finish_reason: string }[];
}

async function callAI(
    role: string,
    page: string,
    history: ChatMessage[],
    message: string
): Promise<ChatReply | null> {
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "your_openrouter_api_key_here") return null;

    const normalizedPage = normalizePage(page);
    const pageCtx = PAGE_CONTEXTS[normalizedPage] ?? `Current page: ${page}`;

    const systemContent = `You are the EventLive Assistant. Your tone is professional and concise. Do not use emojis.

ROLE: ${getRoleContext(role)}
PAGE: ${pageCtx}

INSTRUCTIONS:
- Provide clear, professional answers about EventLive.
- Use numbered lists for steps.
- At the end of your response, provide exactly 3 follow-up questions the user might ask next, formatted as a JSON array under the heading "SUGGESTIONS".

Example end of response:
SUGGESTIONS: ["How do I add a speaker?", "Can I save as draft?", "What are the rules?"]`;

    const messages: { role: string; content: string }[] = [
        { role: "system", content: systemContent },
        ...history,
        { role: "user", content: message },
    ];

    try {
        const res = await axios.post<OpenRouterResponse>(
            OPENROUTER_URL,
            { model: OPENROUTER_MODEL, messages, max_tokens: 1024, temperature: 0.3 },
            {
                headers: {
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://eventliveclient.netlify.app",
                    "X-Title": "EventLive",
                },
                timeout: 30_000,
            }
        );

        const rawContent = res.data?.choices?.[0]?.message?.content || "";
        const [reply, suggestionPart] = rawContent.split("SUGGESTIONS:");

        let suggestions = ["Tell me more", "Back to dashboard", "Contact support"];
        if (suggestionPart) {
            try {
                const parsed = JSON.parse(suggestionPart.trim());
                if (Array.isArray(parsed)) suggestions = parsed.slice(0, 3);
            } catch (e) {
                // Fallback to extraction if not valid JSON
                suggestions = suggestionPart.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, "")) || suggestions;
            }
        }

        return { reply: reply.trim(), suggestions };
    } catch (err) {
        if (axios.isAxiosError(err)) {
            console.error(`[ChatBot] AI Error: ${err.response?.status}`);
        }
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
export async function getChatReply(
    message: string,
    role: string,
    page: string,
    history: ChatMessage[]
): Promise<ChatReply> {

    const localReply = detectLocalIntent(message, role);
    if (localReply) return localReply;

    const aiReply = await callAI(role, page, history, message);
    if (aiReply) return aiReply;

    return {
        reply: "I am unable to reach the AI service at this moment. However, I can provide information on event creation, joining sessions, managing speakers, and account settings. Please ask a specific question about these topics.",
        suggestions: ["How to create an event", "How to join a session", "How to reset password"]
    };
}
