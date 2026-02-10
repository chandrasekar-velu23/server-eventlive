import request from 'supertest';
import app from './app';
import Event from './models/event.model';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

jest.mock('./models/event.model');
jest.mock('jsonwebtoken');

describe('Event Endpoints & RBAC', () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockUser = { id: mockUserId, email: 'test@example.com', role: 'Organizer' };
    const mockToken = 'valid-token';
    const mockEventId = new mongoose.Types.ObjectId().toString();

    // Reset mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
        (jwt.verify as jest.Mock).mockReturnValue(mockUser);
    });

    describe('GET /api/events/my', () => {
        it('should return only events owned by the user', async () => {
            const mockEvents = [
                { title: 'My Event', organizerId: mockUserId }
            ];

            // Mock chain: find -> sort
            const mockFind = {
                sort: jest.fn().mockResolvedValue(mockEvents)
            };
            (Event.find as jest.Mock).mockReturnValue(mockFind);

            const res = await request(app)
                .get('/api/events/my')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].title).toBe('My Event');
            expect(Event.find).toHaveBeenCalledWith({ organizerId: mockUserId });
        });

        it('should return 401 if no token provided', async () => {
            const res = await request(app).get('/api/events/my');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/events/all', () => {
        it('should return all public events', async () => {
            const mockEvents = [
                { title: 'Public Event 1', visibility: 'public' },
                { title: 'Public Event 2', visibility: 'public' }
            ];
            const mockFind = {
                sort: jest.fn().mockResolvedValue(mockEvents)
            };
            (Event.find as jest.Mock).mockReturnValue(mockFind);

            const res = await request(app).get('/api/events/all');

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
            expect(Event.find).toHaveBeenCalledWith({ visibility: 'public' });
        });
    });

    describe('GET /api/events/:id', () => {
        it('should return event details for public event', async () => {
            const mockEvent = { _id: mockEventId, title: 'Single Event', visibility: 'public' };
            (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

            const res = await request(app).get(`/api/events/${mockEventId}`);

            expect(res.status).toBe(200);
            expect(res.body.data.title).toBe('Single Event');
        });

        it('should return event details for private event if owner', async () => {
            const mockEvent = {
                _id: mockEventId,
                title: 'Private Event',
                visibility: 'private',
                organizerId: mockUserId
            };
            (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

            const res = await request(app)
                .get(`/api/events/${mockEventId}`)
                .set('Authorization', `Bearer ${mockToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.title).toBe('Private Event');
        });

        it('should return 403 for private event if NOT owner', async () => {
            const mockEvent = {
                _id: mockEventId,
                title: 'Private Event',
                visibility: 'private',
                organizerId: 'different-user-id'
            };
            (Event.findById as jest.Mock).mockResolvedValue(mockEvent);

            const res = await request(app)
                .get(`/api/events/${mockEventId}`)
                .set('Authorization', `Bearer ${mockToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Access denied/);
        });



        it('should return 404 for invalid ID', async () => {
            (Event.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).get(`/api/events/${mockEventId}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/events/:id (Ownership + RBAC)', () => {
        it('should update event if owned by user', async () => {
            const mockEvent = {
                _id: mockEventId,
                organizerId: mockUserId,
                save: jest.fn().mockResolvedValue(true)
            };
            (Event.findOne as jest.Mock).mockResolvedValue(mockEvent);

            const res = await request(app)
                .put(`/api/events/${mockEventId}`)
                .set('Authorization', `Bearer ${mockToken}`)
                .send({ title: 'Updated Title' });

            expect(res.status).toBe(200);
            expect(mockEvent.save).toHaveBeenCalled();
        });

        it('should ignore immutable fields updates', async () => {
            const mockEvent = {
                _id: mockEventId,
                organizerId: mockUserId,
                sessionCode: 'OLDCODE',
                save: jest.fn().mockResolvedValue(true)
            };
            (Event.findOne as jest.Mock).mockResolvedValue(mockEvent);

            const res = await request(app)
                .put(`/api/events/${mockEventId}`)
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    title: 'New Title',
                    organizerId: 'new-owner',
                    sessionCode: 'NEWCODE'
                });

            expect(res.status).toBe(200);
            expect(mockEvent.organizerId).toBe(mockUserId); // Should not change
            expect(mockEvent.sessionCode).toBe('OLDCODE'); // Should not change
        });

        it('should return 404/403 if user does not own event', async () => {
            (Event.findOne as jest.Mock).mockResolvedValue(null); // findOne checks ownerId, so null implies not found or not owner

            const res = await request(app)
                .put(`/api/events/${mockEventId}`)
                .set('Authorization', `Bearer ${mockToken}`)
                .send({ title: 'Hacked Title' });

            expect(res.status).toBe(404); // Controller returns 404 for "Event not found or unauthorized"
        });
    });

    describe('DELETE /api/events/:id (Ownership + RBAC)', () => {
        it('should delete event if owned by user', async () => {
            (Event.findOneAndDelete as jest.Mock).mockResolvedValue({ _id: mockEventId });

            const res = await request(app)
                .delete(`/api/events/${mockEventId}`)
                .set('Authorization', `Bearer ${mockToken}`);

            expect(res.status).toBe(200);
            expect(Event.findOneAndDelete).toHaveBeenCalledWith({ _id: mockEventId, organizerId: mockUserId });
        });

        it('should return 404/403 if user does not own event', async () => {
            (Event.findOneAndDelete as jest.Mock).mockResolvedValue(null);

            const res = await request(app)
                .delete(`/api/events/${mockEventId}`)
                .set('Authorization', `Bearer ${mockToken}`);

            expect(res.status).toBe(404);
        });

        it('should perform permanent delete', async () => {
            (Event.findOneAndDelete as jest.Mock).mockResolvedValue({ _id: mockEventId });
            const res = await request(app)
                .delete(`/api/events/${mockEventId}`)
                .set('Authorization', `Bearer ${mockToken}`);
            expect(res.status).toBe(200);
            expect(Event.findOneAndDelete).toHaveBeenCalled();
        });
    });
});
