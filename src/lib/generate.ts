import axios from "axios";
import { POSE_INSTRUCTIONS } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

export async function generateImages(
  file: File | string,
  prompt: string,
  onImageReady: (index: number, url: string) => void,
  silhouette?: File | string
): Promise<{ imageUrls: string[]; sessionId: string }> {

  // 1. Upload Swatch and Silhouette
  let sessionId: string;
  let swatchUrl: string;
  let silhouetteUrl: string | undefined;

  // Handle Swatch
  if (typeof file === 'string') {
    const uploadRes = await axios.post(`${API_BASE_URL}/session/upload-url`, { url: file });
    if (!uploadRes.data.ok) throw new Error('Failed to upload swatch from URL');
    sessionId = uploadRes.data.sessionId;
    swatchUrl = uploadRes.data.url;
  } else {
    const formData = new FormData();
    formData.append('swatch', file);
    const uploadRes = await axios.post(`${API_BASE_URL}/session/upload`, formData);
    if (!uploadRes.data.ok) throw new Error('Failed to upload swatch');
    sessionId = uploadRes.data.sessionId;
    swatchUrl = uploadRes.data.url;
  }

  // Handle Silhouette (optional)
  if (silhouette) {
    if (typeof silhouette === 'string') {
      // For now, we reuse the same upload-url but we might need a specific silhouette field in the backend
      // Actually, my backend controllers expect sessionId.
      // Let's just send it in the generate request or upload it first.
      // I'll update the backend to handle silhouette in the upload controllers.
      const uploadRes = await axios.post(`${API_BASE_URL}/session/upload-url`, { url: silhouette, type: 'silhouette', sessionId });
      if (!uploadRes.data.ok) throw new Error('Failed to upload silhouette from URL');
      silhouetteUrl = uploadRes.data.url;
    } else {
      const formData = new FormData();
      formData.append('silhouette', silhouette);
      formData.append('sessionId', sessionId);
      formData.append('type', 'silhouette');
      const uploadRes = await axios.post(`${API_BASE_URL}/session/upload`, formData);
      if (!uploadRes.data.ok) throw new Error('Failed to upload silhouette');
      silhouetteUrl = uploadRes.data.url;
    }
  }

  // 2. Start Generation
  const generateRes = await axios.post(`${API_BASE_URL}/session/generate`, {
    sessionId,
    prompt,
    options: {}, // Options can be passed if needed
    silhouetteUrl // Backend should use this if provided
  });

  if (!generateRes.data.ok) {
    throw new Error('Failed to start generation');
  }

  const { jobId } = generateRes.data;
  const imageUrls = await pollJobStatus(jobId, onImageReady);
  return { imageUrls, sessionId };
}

export async function refineImage(
  sessionId: string,
  imageUrl: string,
  prompt: string,
  index: number,
  onImageReady: (index: number, url: string) => void
): Promise<string[]> {
  const refineRes = await axios.post(`${API_BASE_URL}/session/refine`, {
    sessionId,
    imageUrl,
    prompt,
    index,
  });

  if (!refineRes.data.ok) {
    throw new Error('Failed to start refinement');
  }

  const { jobId } = refineRes.data;
  return pollJobStatus(jobId, (idx, url) => onImageReady(index, url)); // Always overwrite the same index
}

async function pollJobStatus(
  jobId: string,
  onImageReady: (index: number, url: string) => void
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const statusRes = await axios.get(`${API_BASE_URL}/session/job/${jobId}/status`);
        const statusData = statusRes.data;

        if (statusData.status === 'COMPLETED') {
          clearInterval(pollInterval);
          const images = statusData.images || [];
          const urls = images.map((img: any) => img.url);

          images.forEach((img: any) => {
            onImageReady(img.seed, img.url);
          });

          resolve(urls);
        } else if (statusData.status === 'FAILED') {
          clearInterval(pollInterval);
          reject(new Error(statusData.error || 'Generation failed'));
        }
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, 2000);
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
