import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { initializeWebSocket } from './services/websocket.service';
import Session from './models/session.model';
import ChatMessage from './models/chatMessage.model';
import User from './models/user.model';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('socket.io');
jest.mock('jsonwebtoken');
jest.mock('./models/session.model');
jest.mock('./models/chatMessage.model');
jest.mock('./models/user.model');
jest.mock('./services/mail.service', () => ({
    sendLobbyWaitNotification: jest.fn().mockResolvedValue({}),
}));
jest.mock('./services/attendance.service', () => ({
    logCheckIn: jest.fn().mockResolvedValue({}),
    logCheckOut: jest.fn().mockResolvedValue({}),
}));

describe('WebSocket Signaling & Lobby Approval', () => {
    let io: any;
    let sessionNamespace: any;
    let socket: any;
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockSessionId = new mongoose.Types.ObjectId().toString();
    const mockRoomId = 'TEST-ROOM';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Socket.io Server and Namespace
        sessionNamespace = {
            use: jest.fn(),
            on: jest.fn(),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        io = {
            of: jest.fn().mockReturnValue(sessionNamespace),
        };

        // Mock Socket
        socket = {
            id: 'socket-id',
            handshake: { auth: { token: 'mock-token' }, address: '127.0.0.1' },
            data: { user: { userId: mockUserId, name: 'Test User' } },
            join: jest.fn(),
            leave: jest.fn(),
            emit: jest.fn(),
            on: jest.fn(),
        };

        (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId, name: 'Test User' });

        initializeWebSocket(io as any);
    });

    it('should allow user to join session and join correct room', async () => {
        const mockSession = {
            _id: mockSessionId,
            sessionCode: mockRoomId,
            status: 'live',
            participants: [] as any[],
            organizerId: new mongoose.Types.ObjectId().toString(),
            requireApproval: false,
            save: jest.fn().mockResolvedValue(true),
        };

        (Session.findOne as jest.Mock).mockResolvedValue(mockSession);

        // Get the join-session handler
        const connectionHandler = sessionNamespace.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
        connectionHandler(socket);

        const joinSessionHandler = socket.on.mock.calls.find((call: any) => call[0] === 'join-session')[1];

        await joinSessionHandler({ roomId: mockRoomId });

        expect(socket.join).toHaveBeenCalledWith(mockRoomId);
        expect(mockSession.participants).toHaveLength(1);
        expect(mockSession.participants[0].userId).toBe(mockUserId);
        expect(sessionNamespace.to).toHaveBeenCalledWith(mockRoomId);
        expect(sessionNamespace.emit).toHaveBeenCalledWith('participant-joined', expect.objectContaining({
            userId: mockUserId
        }));
    });

    it('should place attendee in pending status if requireApproval is true', async () => {
        const mockSession = {
            _id: mockSessionId,
            sessionCode: mockRoomId,
            status: 'live',
            participants: [] as any[],
            organizerId: new mongoose.Types.ObjectId().toString(), // Not the same as mockUserId
            requireApproval: true,
            save: jest.fn().mockResolvedValue(true),
            title: 'Test Session',
        };

        (Session.findOne as jest.Mock).mockResolvedValue(mockSession);
        (User.findById as jest.Mock).mockResolvedValue({ email: 'org@example.com' });

        const connectionHandler = sessionNamespace.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
        connectionHandler(socket);
        const joinSessionHandler = socket.on.mock.calls.find((call: any) => call[0] === 'join-session')[1];

        await joinSessionHandler({ roomId: mockRoomId });

        expect(mockSession.participants[0].status).toBe('pending');
        expect(socket.emit).toHaveBeenCalledWith('waiting-for-approval', expect.anything());
        // Should NOT broadcast participant-joined yet
        expect(sessionNamespace.emit).not.toHaveBeenCalledWith('participant-joined', expect.anything());
    });

    it('should broadcast media state including screenshare', async () => {
        const connectionHandler = sessionNamespace.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
        connectionHandler(socket);
        const updateMediaHandler = socket.on.mock.calls.find((call: any) => call[0] === 'update-media-state')[1];

        socket.data.currentRoomId = mockRoomId;
        (Session.findById as jest.Mock).mockResolvedValue({
            participants: [{ userId: mockUserId, save: jest.fn() }],
            save: jest.fn()
        });

        await updateMediaHandler({
            sessionId: mockSessionId,
            isMuted: false,
            videoEnabled: true,
            screenshareActive: true
        });

        expect(sessionNamespace.to).toHaveBeenCalledWith(mockRoomId);
        expect(sessionNamespace.emit).toHaveBeenCalledWith('participant-media-changed', expect.objectContaining({
            userId: mockUserId,
            screenshareActive: true
        }));
    });
});
