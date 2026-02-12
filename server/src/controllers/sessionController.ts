
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { supabase } from '../utils/supabase';
import { generateImage, getJobStatus as getKieJobStatus } from '../services/kieService';
import axios from 'axios';

// Helper to sanitize filename for Supabase storage
const sanitizeFilename = (filename: string): string => {
    // 1. Get extension safely
    const parts = filename.split('.');
    let ext = "";
    let base = filename;

    const possibleExt = parts[parts.length - 1]?.toLowerCase();
    const commonExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'pdf'];

    if (parts.length > 1 && commonExtensions.includes(possibleExt!)) {
        ext = parts.pop() || "";
        base = parts.join('.');
    }

    // 2. Sanitize: replace spaces and special chars with underscore
    const sanitizedBase = base
        .replace(/\s+/g, '_') // Replace all spaces with underscores
        .replace(/[^a-zA-Z0-9.\-_]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');

    const finalName = ext ? `${sanitizedBase}.${ext}` : sanitizedBase;
    return finalName || 'uploaded_image';
};

// Helper to upload file to Supabase
const uploadToSupabase = async (file: Express.Multer.File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
        });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrlData.publicUrl;
};

const downloadAndUploadImage = async (url: string, jobId: string, index: number): Promise<string> => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        // create a dummy file object for uploadToSupabase or just use supabase directly
        const path = `generated/${jobId}_${index}.png`;
        const { error } = await supabase.storage
            .from('generations')
            .upload(path, buffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) throw error;
        const { data } = supabase.storage.from('generations').getPublicUrl(path);
        return data.publicUrl;
    } catch (e) {
        console.error("Failed to download/upload image", e);
        return url; // Fallback to original URL
    }
}

export const uploadSwatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const { sessionId, type } = req.body;

        const file = files && files[type === 'silhouette' ? 'silhouette' : 'swatch']
            ? files[type === 'silhouette' ? 'silhouette' : 'swatch'][0]
            : null;

        if (!file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const bucket = type === 'silhouette' ? 'silhouettes' : 'swatches';

        const safeFilename = sanitizeFilename(file.originalname);
        const filename = `${Date.now()}_${safeFilename}`;
        const imageUrl = await uploadToSupabase(file, bucket, filename);

        let session;
        if (sessionId) {
            session = await prisma.session.update({
                where: { id: sessionId },
                data: type === 'silhouette' ? { silhouetteUrl: imageUrl } : { swatchUrl: imageUrl },
            });
        } else {
            session = await prisma.session.create({
                data: type === 'silhouette' ? { silhouetteUrl: imageUrl, swatchUrl: '' } : { swatchUrl: imageUrl },
            });
        }

        res.json({ ok: true, sessionId: session.id, url: imageUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
};

export const uploadSwatchByUrl = async (req: Request, res: Response): Promise<void> => {
    try {
        const { url, sessionId, type } = req.body;
        if (!url) {
            res.status(400).json({ error: 'URL is required' });
            return;
        }

        const bucket = type === 'silhouette' ? 'silhouettes' : 'swatches';

        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const contentType = response.headers['content-type'] || 'image/jpeg';

        const urlPath = new URL(url).pathname;
        const baseName = urlPath.split('/').pop() || 'image.jpg';
        const safeFilename = sanitizeFilename(baseName);
        const filename = `${Date.now()}_${safeFilename}`;

        const { error } = await supabase.storage
            .from(bucket)
            .upload(filename, buffer, {
                contentType,
                upsert: true,
            });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filename);
        const imageUrl = publicUrlData.publicUrl;

        let session;
        if (sessionId) {
            session = await prisma.session.update({
                where: { id: sessionId },
                data: type === 'silhouette' ? { silhouetteUrl: imageUrl } : { swatchUrl: imageUrl },
            });
        } else {
            session = await prisma.session.create({
                data: type === 'silhouette' ? { silhouetteUrl: imageUrl, swatchUrl: '' } : { swatchUrl: imageUrl },
            });
        }

        res.json({ ok: true, sessionId: session.id, url: imageUrl });
    } catch (error) {
        console.error('URL upload error:', error);
        res.status(500).json({ error: 'Failed to upload image from URL' });
    }
};

export const generateImages = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId, prompt, options, numGenerations = 4 } = req.body;

        if (!sessionId || !prompt) {
            res.status(400).json({ error: 'Session ID and prompt are required' });
            return;
        }

        const session = await prisma.session.findUnique({ where: { id: sessionId } });
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        // Update session with prompt and options
        await prisma.session.update({
            where: { id: sessionId },
            data: { promptText: prompt, options, consent: true }, // Assuming consent is checked if they click generate
        });

        // Create a job
        const job = await prisma.job.create({
            data: {
                sessionId,
                status: 'PENDING',
            },
        });

        const allPoses = [
            "standing front view, hands relaxed at sides",
            "three-quarter view, one hand in pocket",
            "side profile view, walking pose",
            "standing back view, looking over shoulder",
        ];

        const poses = allPoses.slice(0, numGenerations);

        // Call KIE API for each pose
        const taskPromises = poses.map(pose => {
            let posePrompt = `${prompt}. Model pose: ${pose}. Strictly use the FIRST reference image for fabric texture/color.`;
            if (session.silhouetteUrl) {
                posePrompt += ` Strictly use the SECOND reference image for the exact garment silhouette and structure. The final output must match the shape of the second image perfectly.`;
            }
            return generateImage(posePrompt, session.swatchUrl, session.silhouetteUrl || undefined);
        });

        const kieResponses = await Promise.all(taskPromises);
        const taskIds = kieResponses.map(res => res.taskId);

        // Update job with KIE task IDs as JSON
        await prisma.job.update({
            where: { id: job.id },
            data: {
                kieJobId: JSON.stringify(taskIds),
                status: 'PROCESSING',
            },
        });

        res.json({ ok: true, jobId: job.id });
    } catch (error: any) {
        console.error('Generation error:', error);
        res.status(500).json({ error: error.message || 'Failed to start generation' });
    }
};

export const refineImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId, imageUrl, prompt, index } = req.body;

        if (!sessionId || !imageUrl || !prompt) {
            res.status(400).json({ error: 'Session ID, Image URL, and prompt are required' });
            return;
        }

        const session = await prisma.session.findUnique({ where: { id: sessionId } });
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        // Create a job for refinement
        const job = await prisma.job.create({
            data: {
                sessionId,
                status: 'PENDING',
            },
        });

        // Call KIE API with the generated image as a reference
        // Order: [Refined Base (1), Swatch (2), Silhouette (3)]
        let refinePromptStrict = `${prompt}. Maintain the fabric texture from the second reference and strictly follow the garment design from the third reference image.`;

        const kieResponse = await generateImage(
            refinePromptStrict,
            imageUrl, // 1. Current generated image as base
            session.swatchUrl, // 2. Original swatch
            session.silhouetteUrl || undefined // 3. Original silhouette
        );

        await prisma.job.update({
            where: { id: job.id },
            data: {
                kieJobId: kieResponse.taskId,
                status: 'PROCESSING',
            },
        });

        res.json({ ok: true, jobId: job.id, index });
    } catch (error: any) {
        console.error('Refinement error:', error);
        res.status(500).json({ error: error.message || 'Failed to start refinement' });
    }
};

export const getJobStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const job = await prisma.job.findUnique({
            where: { id: id as string },
            include: { images: true },
        });

        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            res.json({ status: job.status, images: (job as any).images });
            return;
        }

        // Check KIE status if PENDING or PROCESSING
        if (job.kieJobId) {
            let taskIds: string[] = [];
            try {
                // Try to parse as JSON array (new format)
                taskIds = JSON.parse(job.kieJobId);
                if (!Array.isArray(taskIds)) taskIds = [job.kieJobId];
            } catch {
                // Fallback to single ID (old format)
                taskIds = [job.kieJobId];
            }

            // Only poll tasks that don't have a corresponding image yet
            const pollPromises = taskIds.map(async (taskId, index) => {
                // Check if we already have an image for this index
                const existingImage = job.images.find(img => img.seed === index);
                if (existingImage) return null;

                try {
                    const kieResponse = await getKieJobStatus(taskId);
                    if (kieResponse.code === 200 && kieResponse.data.state === 'success') {
                        const kieData = kieResponse.data;
                        let imageUrls: string[] = [];
                        if (kieData.resultJson) {
                            const result = JSON.parse(kieData.resultJson);
                            imageUrls = result.resultUrls || [];
                        }

                        if (imageUrls.length > 0) {
                            const finalUrl = await downloadAndUploadImage(imageUrls[0], job.id, index);
                            return await prisma.image.create({
                                data: {
                                    jobId: job.id,
                                    url: finalUrl,
                                    seed: index,
                                }
                            });
                        }
                    }
                    return null;
                } catch (e) {
                    console.error(`Error polling task ${taskId}:`, e);
                    return null;
                }
            });

            await Promise.all(pollPromises);

            // Refetch job to get updated images
            const updatedJob = await prisma.job.findUnique({
                where: { id: id as string },
                include: { images: true },
            });

            if (updatedJob && updatedJob.images.length >= taskIds.length) {
                await prisma.job.update({
                    where: { id: job.id },
                    data: { status: 'COMPLETED' }
                });
                res.json({ status: 'COMPLETED', images: updatedJob.images });
                return;
            }

            res.json({
                status: 'PROCESSING',
                images: updatedJob?.images || job.images
            });
            return;
        }

        res.json({ status: job.status });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check job status' });
    }
};
