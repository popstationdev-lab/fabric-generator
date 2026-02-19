export type FabricType = "Cotton" | "Linen" | "Silk" | "Denim" | "Polyester" | "Wool" | "Tweed" | "Velvet";
export type Lighting = "Studio" | "Natural" | "Warm" | "Cool" | "Dramatic";
export type Background = "White Studio" | "Grey Gradient" | "Outdoor" | "Minimalist";
export type Fit = "Slim" | "Regular" | "Relaxed" | "Oversized";
export type GarmentType = "Shirt" | "T-shirt" | "Polo" | "Jacket" | "Overshirt" | "Jeans" | "Trousers" | "Joggers" | "Shorts" | "Sweater" | "Sweatshirt";
export type MeasurementUnit = "cm" | "inches";

export interface FormConfig {
  fabricType: FabricType;
  garmentType: GarmentType;
  lighting: Lighting;
  background: Background;
  fit: Fit;
  repeatWidth?: number;
  repeatHeight?: number;
  repeatUnit: MeasurementUnit;
  numGenerations: number;
}

export interface GenerationState {
  status: "idle" | "generating" | "done" | "error";
  images: (string | null)[];
  error?: string;
}

export const FABRIC_TYPES: FabricType[] = ["Cotton", "Linen", "Silk", "Denim", "Polyester", "Wool", "Tweed", "Velvet"];
export const GARMENT_TYPES: GarmentType[] = ["Shirt", "T-shirt", "Polo", "Jacket", "Overshirt", "Jeans", "Trousers", "Joggers", "Shorts", "Sweater", "Sweatshirt"];
export const LIGHTINGS: Lighting[] = ["Studio", "Natural", "Warm", "Cool", "Dramatic"];
export const BACKGROUNDS: Background[] = ["White Studio", "Grey Gradient", "Outdoor", "Minimalist"];
export const FITS: Fit[] = ["Slim", "Regular", "Relaxed", "Oversized"];
export const UNITS: MeasurementUnit[] = ["cm", "inches"];

export const POSE_INSTRUCTIONS = [
  "standing front view, hands relaxed at sides",
  "three-quarter view, one hand in pocket",
  "side profile view, walking pose",
  "standing back view, looking over shoulder",
];

export function buildPrompt(config: FormConfig): string {
  const pluralGarments: GarmentType[] = ["Jeans", "Trousers", "Joggers"];
  const isPlural = pluralGarments.includes(config.garmentType);
  const article = isPlural ? "" : "a ";
  const garment = config.garmentType.toLowerCase();

  let repeatInfo = "";
  if (config.repeatWidth && config.repeatHeight) {
    repeatInfo = ` The fabric pattern repeat size is ${config.repeatWidth}x${config.repeatHeight} ${config.repeatUnit}.`;
  }

  return `Product photography of ${article}${config.fit.toLowerCase()} fit ${garment}. The garment is strictly ${config.garmentType} style. Fabric: ${config.fabricType}. ${repeatInfo} The ${garment} must look exactly like it is made from the provided fabric swatch, matching its pattern, texture, and color perfectly. Lighting: ${config.lighting}. Background: ${config.background.toLowerCase()}. High-end fashion editorial, 8K, commercial quality.`;
}
