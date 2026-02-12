
import { Router } from 'express';
import multer from 'multer';
import { uploadSwatch, generateImages, getJobStatus } from '../controllers/sessionController';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 } // 8MB limit
});

router.post('/upload', upload.single('swatch'), uploadSwatch);
router.post('/generate', generateImages);
router.get('/job/:id/status', getJobStatus);

export default router;
