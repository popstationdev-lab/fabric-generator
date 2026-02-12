
import { Router } from 'express';
import multer from 'multer';
import { uploadSwatch, uploadSwatchByUrl, generateImages, getJobStatus, refineImage } from '../controllers/sessionController';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 } // 8MB limit
});

router.post('/upload', upload.fields([{ name: 'swatch', maxCount: 1 }, { name: 'silhouette', maxCount: 1 }]), uploadSwatch);
router.post('/upload-url', uploadSwatchByUrl);
router.post('/generate', generateImages);
router.post('/refine', refineImage);
router.get('/job/:id/status', getJobStatus);

export default router;
