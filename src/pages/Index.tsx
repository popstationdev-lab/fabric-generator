import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, RotateCcw, AlertCircle, ArrowLeft } from "lucide-react";
import JSZip from "jszip";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SwatchUploader } from "@/components/SwatchUploader";
import { ConfigForm } from "@/components/ConfigForm";
import { PromptEditor } from "@/components/PromptEditor";
import { ResultsGrid } from "@/components/ResultsGrid";
import { toast } from "@/hooks/use-toast";
import { FormConfig, GenerationState, buildPrompt } from "@/lib/types";
import { generateImages, fileToBase64 } from "@/lib/generate";

type View = "configure" | "results";

const DEFAULT_CONFIG: FormConfig = {
  fabricType: "Cotton",
  lighting: "Studio",
  background: "White Studio",
  fit: "Regular",
};

export default function Index() {
  const [view, setView] = useState<View>("configure");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [config, setConfig] = useState<FormConfig>(DEFAULT_CONFIG);
  const [prompt, setPrompt] = useState(buildPrompt(DEFAULT_CONFIG));
  const [consent, setConsent] = useState(false);
  const [generation, setGeneration] = useState<GenerationState>({
    status: "idle",
    images: [null, null, null, null],
  });

  // Update prompt when config changes
  useEffect(() => {
    setPrompt(buildPrompt(config));
  }, [config]);

  const canGenerate = file !== null && consent && prompt.trim().length > 0;

  const handleGenerate = useCallback(async () => {
    if (!file) return;

    setView("results");
    setGeneration({ status: "generating", images: [null, null, null, null] });

    try {
      await generateImages(file, prompt, (index, url) => {
        setGeneration((prev) => {
          const images = [...prev.images];
          images[index] = url;
          return { ...prev, images };
        });
      });
      setGeneration((prev) => ({ ...prev, status: "done" }));
      toast({ title: "Generation complete", description: "Your 4 product images are ready!" });
    } catch (err: any) {
      setGeneration((prev) => ({
        ...prev,
        status: "error",
        error: err.message || "Something went wrong",
      }));
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
  }, [file, prompt]);

  const handleDownloadAll = useCallback(async () => {
    const images = generation.images.filter(Boolean) as string[];
    if (images.length === 0) return;

    const zip = new JSZip();
    const labels = ["front-view", "three-quarter", "side-profile", "back-view"];

    await Promise.all(
      images.map(async (url, i) => {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
        try {
          const res = await fetch(`${apiUrl}/proxy-image?url=${encodeURIComponent(url)}`);
          if (!res.ok) throw new Error("Failed to fetch image via proxy");
          const blob = await res.blob();
          zip.file(`fabricviz-${labels[i]}.png`, blob);
        } catch (e) {
          console.error("Failed to download image", url, e);
          // Fallback to direct fetch if proxy fails (though likely to fail CORS too)
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            zip.file(`fabricviz-${labels[i]}.png`, blob);
          } catch (e2) {
            console.error("Direct fetch also failed", e2);
          }
        }
      })
    );

    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "fabricviz-images.zip";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [generation.images]);

  const handleGenerateAgain = useCallback(() => {
    setView("configure");
    setGeneration({ status: "idle", images: [null, null, null, null] });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-primary">Fabric</span>Viz
          </h1>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Fabric Swatch → Product Images
          </span>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === "configure" ? (
            <motion.div
              key="configure"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
                {/* Left: Upload */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Upload Swatch</h2>
                    <p className="text-sm text-muted-foreground">
                      Upload a photo of your fabric swatch to visualize it on a garment.
                    </p>
                  </div>
                  <SwatchUploader file={file} preview={preview} onFileChange={(f, p) => { setFile(f); setPreview(p); }} />
                </div>

                {/* Right: Config + Prompt */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Configure</h2>
                    <p className="text-sm text-muted-foreground">
                      Set product options to guide the image generation.
                    </p>
                  </div>

                  <ConfigForm config={config} onChange={setConfig} />

                  <PromptEditor value={prompt} onChange={setPrompt} />

                  {/* Consent */}
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="consent"
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked === true)}
                    />
                    <Label htmlFor="consent" className="text-sm leading-snug cursor-pointer">
                      I confirm I own or have rights to use this image
                    </Label>
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    disabled={!canGenerate}
                    onClick={handleGenerate}
                  >
                    Generate Product Images
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {generation.status === "generating"
                        ? "Generating..."
                        : generation.status === "error"
                          ? "Generation Failed"
                          : "Your Product Images"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {generation.status === "generating"
                        ? "Creating 4 product images with your fabric swatch..."
                        : generation.status === "error"
                          ? generation.error
                          : "4 views of your garment are ready for download."}
                    </p>
                  </div>
                  {generation.status === "generating" && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                </div>

                {generation.status === "error" ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center space-y-4">
                    <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                    <p className="text-sm text-destructive">{generation.error}</p>
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" onClick={handleGenerateAgain}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Editor
                      </Button>
                      <Button onClick={handleGenerate}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Retry
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <ResultsGrid images={generation.images} status={generation.status} />

                    <div className="flex gap-3 justify-center pt-2">
                      <Button variant="outline" onClick={handleGenerateAgain}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Generate Again
                      </Button>
                      {generation.status === "done" && (
                        <Button onClick={handleDownloadAll}>
                          <Download className="h-4 w-4 mr-1" /> Download All as ZIP
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
