

# FabricViz MVP — Fabric Swatch to Product Images

## Overview
A web app that lets users upload a fabric swatch image, configure product options, and generate 4 photorealistic product images of a male model wearing a garment made from that fabric. Powered by the kie.ai nano-banana-pro API via a Supabase edge function.

---

## Page 1: Upload & Configure (Single Page Flow)

### Upload Section
- Drag-and-drop or click-to-upload area for fabric swatch (JPG/PNG, max 8MB)
- Image preview after upload
- Client-side validation for file type and size

### Configuration Form
- **Fabric Type** dropdown (e.g., Cotton, Linen, Silk, Denim, Polyester)
- **Lighting** dropdown (e.g., Studio, Natural, Warm, Cool, Dramatic)
- **Background** dropdown (e.g., White Studio, Grey Gradient, Outdoor, Minimalist)
- **Fit** dropdown (e.g., Slim, Regular, Relaxed, Oversized)
- Model Gender fixed to "Male" (displayed but not editable for V1)

### Auto-Generated Prompt
- Editable textarea that updates live as dropdown selections change
- Uses the prompt template from the PRD with placeholders filled from form values
- Users can freely edit the text before generating

### Consent & Generate
- Checkbox: "I confirm I own or have rights to use this image"
- **Generate** button (disabled until image uploaded + consent checked)

---

## Page 2: Results

### Generation Progress
- Loading state with spinner and status message while images generate
- 4 placeholder cards that fill in as images complete

### Image Grid
- 2×2 grid displaying the 4 generated product images
- Each image has an individual download button
- "Download All as ZIP" button for batch download
- "Generate Again" button to return to the form with settings preserved

### Error Handling
- Clear error messages for: invalid image, API failure, timeout
- Retry button on errors

---

## Backend (Supabase Edge Functions)

### Edge Function: `generate-images`
- Accepts the uploaded swatch image (base64), prompt text, and form options
- Calls the kie.ai nano-banana-pro API 4 times with different pose instructions
- Uses deterministic seeds (if supported) for consistent model identity
- Returns 4 generated image URLs/data
- Handles retries, rate limiting errors, and timeouts
- Stores the kie.ai API key as a Supabase secret

### Storage
- Supabase Storage bucket for uploaded swatches and generated images
- 30-day retention policy as specified

---

## Design & UX
- Clean, minimal interface — professional tool aesthetic
- Responsive layout (desktop-first, functional on tablet)
- Toast notifications for errors and success states
- Session state preserved in memory during the flow
- Keyboard accessible with proper labels

