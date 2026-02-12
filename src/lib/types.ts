export type FabricType = "Cotton" | "Linen" | "Silk" | "Denim" | "Polyester" | "Wool" | "Tweed" | "Velvet";
export type Lighting = "Studio" | "Natural" | "Warm" | "Cool" | "Dramatic";
export type Background = "White Studio" | "Grey Gradient" | "Outdoor" | "Minimalist";
export type Fit = "Slim" | "Regular" | "Relaxed" | "Oversized";

export interface FormConfig {
  fabricType: FabricType;
  lighting: Lighting;
  background: Background;
  fit: Fit;
}

export interface GenerationState {
  status: "idle" | "generating" | "done" | "error";
  images: (string | null)[];
  error?: string;
}

export const FABRIC_TYPES: FabricType[] = ["Cotton", "Linen", "Silk", "Denim", "Polyester", "Wool", "Tweed", "Velvet"];
export const LIGHTINGS: Lighting[] = ["Studio", "Natural", "Warm", "Cool", "Dramatic"];
export const BACKGROUNDS: Background[] = ["White Studio", "Grey Gradient", "Outdoor", "Minimalist"];
export const FITS: Fit[] = ["Slim", "Regular", "Relaxed", "Oversized"];

export const POSE_INSTRUCTIONS = [
  "standing front view, hands relaxed at sides",
  "three-quarter view, one hand in pocket",
  "side profile view, walking pose",
  "standing back view, looking over shoulder",
];

export function buildPrompt(config: FormConfig): string {
  return `A photorealistic product image of a male model wearing a ${config.fit.toLowerCase()} fit garment made from ${config.fabricType.toLowerCase()} fabric. The garment should accurately replicate the texture, color, and pattern of the provided fabric swatch. ${config.lighting} lighting, ${config.background.toLowerCase()} background. High-end fashion photography, editorial quality, 8K resolution.`;
}
