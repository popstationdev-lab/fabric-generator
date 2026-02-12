import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, RotateCcw, AlertCircle, ArrowLeft } from "lucide-react";
import JSZip from "jszip";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ImageSelector } from "@/components/ImageSelector";
import { ConfigForm } from "@/components/ConfigForm";
import { PromptEditor } from "@/components/PromptEditor";
import { ResultsGrid } from "@/components/ResultsGrid";
import { toast } from "@/hooks/use-toast";
import { FormConfig, GenerationState, buildPrompt } from "@/lib/types";
import { generateImages, refineImage, fileToBase64 } from "@/lib/generate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Wand2, Shirt } from "lucide-react";

type View = "configure" | "results";

const DEFAULT_CONFIG: FormConfig = {
  fabricType: "Cotton",
  garmentType: "Shirt",
  lighting: "Studio",
  background: "White Studio",
  fit: "Regular",
  repeatUnit: "cm",
};

export default function Index() {
  const [view, setView] = useState<View>("configure");
  const [file, setFile] = useState<File | string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [silhouetteFile, setSilhouetteFile] = useState<File | string | null>(null);
  const [silhouettePreview, setSilhouettePreview] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [config, setConfig] = useState<FormConfig>(DEFAULT_CONFIG);
  const [prompt, setPrompt] = useState(buildPrompt(DEFAULT_CONFIG));
  const [consent, setConsent] = useState(false);
  const [generation, setGeneration] = useState<GenerationState>({
    status: "idle",
    images: [null, null, null, null],
  });

  // Refinement state
  const [refiningImage, setRefiningImage] = useState<{ url: string; index: number } | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const [globalRefinementPrompt, setGlobalRefinementPrompt] = useState("");
  const [isGlobalRefining, setIsGlobalRefining] = useState(false);

  // Update prompt when config changes
  useEffect(() => {
    setPrompt(buildPrompt(config));
  }, [config]);

  const canGenerate = file !== null && consent && prompt.trim().length > 0;

  const getErrorMessage = (err: any) => {
    const errorString = (err.response?.data?.error || err.message || "").toLowerCase();
    const isInsufficientCredits =
      err.response?.status === 402 ||
      (err.response?.status === 403 && (errorString.includes("credit") || errorString.includes("balance"))) ||
      errorString.includes("credit") ||
      errorString.includes("balance") ||
      errorString.includes("insufficient");

    const message = isInsufficientCredits
      ? "Insufficient credits. Please top up your KIE AI account."
      : (err.response?.data?.error || err.message || "Something went wrong");

    return { message, isInsufficientCredits };
  };

  const handleGenerate = useCallback(async () => {
    if (!file) return;

    setView("results");
    setGeneration({ status: "generating", images: [null, null, null, null] });

    try {
      // Need a way to get sessionId back from generateImages if we want to reuse it for refinement
      // For now, generateImages returns the final URLs, but we might want it to return sessionId too
      // Let's modify generateImages to return { imageUrls, sessionId } or just store sessionId in backend
      // Actually, my updated backend returns sessionId in the upload response.
      // I'll update generateImages in lib/generate.ts to return sessionId or store it here.

      const res = await generateImages(file, prompt, (index, url) => {
        setGeneration((prev) => {
          const images = [...prev.images];
          images[index] = url;
          return { ...prev, images };
        });
      }, silhouetteFile || undefined);

      // We don't have sessionId here easily unless we change the return type of generateImages
      // But we can fetch it from the first generation result's metadata if needed, 
      // or just have the backend return it. 
      // For now, I'll assume we can use the backend session.

      setSessionId(res.sessionId);

      setGeneration((prev) => ({ ...prev, status: "done" }));
      toast({ title: "Generation complete", description: "Your 4 product images are ready!" });
    } catch (err: any) {
      const { message, isInsufficientCredits } = getErrorMessage(err);

      setGeneration((prev) => ({
        ...prev,
        status: "error",
        error: message,
      }));

      toast({
        title: isInsufficientCredits ? "Credit Issue" : "Generation failed",
        description: message,
        variant: "destructive"
      });
    }
  }, [file, prompt]);

  const handleRefine = useCallback(async () => {
    if (!refiningImage || !refinementPrompt.trim() || !sessionId) return;

    setIsRefining(true);
    const targetIndex = refiningImage.index;

    setGeneration(prev => {
      const images = [...prev.images];
      images[targetIndex] = null;
      return { ...prev, images };
    });

    try {
      await refineImage(sessionId, refiningImage.url, refinementPrompt, targetIndex, (index, url) => {
        setGeneration((prev) => {
          const images = [...prev.images];
          images[index] = url;
          return { ...prev, images };
        });
      });

      toast({ title: "Refinement complete", description: "Image updated!" });
      setRefiningImage(null);
      setRefinementPrompt("");
    } catch (err: any) {
      const { message, isInsufficientCredits } = getErrorMessage(err);
      toast({
        title: isInsufficientCredits ? "Credit Issue" : "Refinement failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsRefining(false);
    }
  }, [refiningImage, refinementPrompt, sessionId]);

  const handleGlobalRefine = useCallback(async () => {
    if (!globalRefinementPrompt.trim() || !sessionId || generation.status !== "done") return;

    setIsGlobalRefining(true);
    const currentImages = [...generation.images];

    // Set all to loading
    setGeneration(prev => ({ ...prev, images: [null, null, null, null] }));

    try {
      const promises = currentImages.map((url, index) => {
        if (!url) return Promise.resolve();
        return refineImage(sessionId, url, globalRefinementPrompt, index, (idx, newUrl) => {
          setGeneration((prev) => {
            const images = [...prev.images];
            images[idx] = newUrl;
            return { ...prev, images };
          });
        });
      });

      await Promise.all(promises);
      toast({ title: "Global refinement complete", description: "All images updated!" });
      setGlobalRefinementPrompt("");
    } catch (err: any) {
      const { message, isInsufficientCredits } = getErrorMessage(err);
      toast({
        title: isInsufficientCredits ? "Credit Issue" : "Global refinement failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsGlobalRefining(false);
    }
  }, [globalRefinementPrompt, sessionId, generation]);

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
    setFile(null);
    setPreview(null);
    setSilhouetteFile(null);
    setSilhouettePreview(null);
    setSessionId(null);
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
                {/* Left: Uploads */}
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Fabric Swatch</h2>
                        <p className="text-sm text-muted-foreground">
                          Upload your fabric photo.
                        </p>
                      </div>
                      <ImageSelector
                        file={file}
                        preview={preview}
                        onFileChange={(f, p) => { setFile(f); setPreview(p); }}
                        placeholder="Swatch"
                        label="Fabric Swatch"
                        aspectRatio="aspect-square"
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold mb-1">Silhouette</h2>
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded">Opt</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upload style reference.
                        </p>
                      </div>
                      <ImageSelector
                        file={silhouetteFile}
                        preview={silhouettePreview}
                        onFileChange={(f, p) => { setSilhouetteFile(f); setSilhouettePreview(p); }}
                        placeholder="Silhouette"
                        label="Silhouette"
                        description="Optional reference"
                        aspectRatio="aspect-square"
                      />
                    </div>
                  </div>
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
                    <div className="bg-card border rounded-xl p-4 mb-6 shadow-sm ring-1 ring-black/5 items-end gap-3 hidden sm:flex">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="global-refine" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                          Refine All Images
                        </Label>
                        <Input
                          id="global-refine"
                          placeholder="e.g. 'Add a leather texture', 'Make background sunny'..."
                          className="h-11 bg-background"
                          value={globalRefinementPrompt}
                          onChange={(e) => setGlobalRefinementPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleGlobalRefine();
                          }}
                        />
                      </div>
                      <Button
                        size="lg"
                        className="h-11 px-6 whitespace-nowrap"
                        disabled={isGlobalRefining || !globalRefinementPrompt.trim()}
                        onClick={handleGlobalRefine}
                      >
                        {isGlobalRefining ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 mr-2" />
                            Update All
                          </>
                        )}
                      </Button>
                    </div>

                    <ResultsGrid
                      images={generation.images}
                      status={generation.status}
                      onEdit={(url, index) => {
                        setRefiningImage({ url, index });
                        setRefinementPrompt(""); // Reset single prompt
                      }}
                    />

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

      {/* Refinement Dialog */}
      <Dialog open={!!refiningImage} onOpenChange={(open) => !open && setRefiningImage(null)}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold">Fine-tune View</DialogTitle>
            <DialogDescription className="text-sm">
              describe changes for this specific view.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
            {refiningImage && (
              <div className="aspect-[3/4] rounded-xl overflow-hidden border shadow-inner bg-muted/50 max-h-[350px] mx-auto">
                <img src={refiningImage.url} alt="To refine" className="w-full h-full object-contain" />
              </div>
            )}
            <div className="space-y-3 pb-6">
              <Label htmlFor="refinement-prompt" className="text-sm font-medium">Your Instruction</Label>
              <Input
                id="refinement-prompt"
                placeholder="e.g. 'Add a pocket', 'Make it navy'..."
                value={refinementPrompt}
                autoFocus
                className="h-12 text-base"
                onChange={(e) => setRefinementPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && refinementPrompt.trim()) handleRefine();
                }}
              />
            </div>
          </div>

          <DialogFooter className="p-6 pt-2 border-t bg-muted/20">
            <Button variant="ghost" onClick={() => setRefiningImage(null)}>Cancel</Button>
            <Button onClick={handleRefine} disabled={isRefining || !refinementPrompt.trim()} className="min-w-[120px]">
              {isRefining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Apply
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
