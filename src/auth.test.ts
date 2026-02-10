import request from 'supertest';
import app from './app';
import User from './models/user.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('./models/user.model');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Endpoints', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with correct credentials', async () => {
            const mockUser = {
                _id: '123',
                name: 'Test User',
                email: 'test@example.com',
                password: 'hashedpassword',
                role: 'User',
                onboardingCompleted: true,
            };

            // Mock chain: findOne -> select -> User
            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockUser)
            };
            (User.findOne as jest.Mock).mockReturnValue(mockQuery);

            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue('mocktoken');

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.data.token).toBe('mocktoken');
            expect(res.body.data.user.email).toBe('test@example.com');

            // Verify select('+password') was called
            expect(mockQuery.select).toHaveBeenCalledWith('+password');
        });

        it('should fail with invalid password', async () => {
            const mockUser = {
                email: 'test@example.com',
                password: 'hashedpassword'
            };
            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockUser)
            };
            (User.findOne as jest.Mock).mockReturnValue(mockQuery);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'wrongpassword' });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid credentials');
        });
    });

    describe('POST /api/auth/signup', () => {
        it('should return nested user object on signup', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
            const mockUser = {
                _id: '123',
                name: 'New User',
                email: 'new@example.com',
                role: 'User',
                onboardingCompleted: false
            };
            (User.create as jest.Mock).mockResolvedValue(mockUser);
            (jwt.sign as jest.Mock).mockReturnValue('mocktoken');

            const res = await request(app)
                .post('/api/auth/signup')
                .send({ name: 'New User', email: 'new@example.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.data.user).toBeDefined();
            expect(res.body.data.user.email).toBe('new@example.com');
        });
    });
});
