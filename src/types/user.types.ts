export interface IUser {
    _id: string;
    name: string;
    email: string;
    password?: string;
    role: 'User' | 'Organizer' | 'Attendee' | 'Admin';
    authProvider: 'local' | 'google';
    onboardingCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
