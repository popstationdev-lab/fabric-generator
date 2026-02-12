
import { Router } from 'express';
import sessionRoutes from './sessionRoutes';

const router = Router();

router.use('/session', sessionRoutes);

export default router;
