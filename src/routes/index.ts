import { Router } from 'express';
import authRoutes from './auth.routes';
import eventRoutes from './event.routes';
import sessionRoutes from './session.routes';
import userRoutes from './user.routes';
import speakerRoutes from './speaker.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/sessions', sessionRoutes);
router.use('/users', userRoutes);
router.use('/speakers', speakerRoutes);
router.use('/stats', analyticsRoutes);

export default router;
