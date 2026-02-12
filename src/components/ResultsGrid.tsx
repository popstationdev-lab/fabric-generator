import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ResultsGridProps {
  images: (string | null)[];
  status: "idle" | "generating" | "done" | "error";
}

const POSE_LABELS = ["Front View", "Three-Quarter", "Side Profile", "Back View"];

export function ResultsGrid({ images, status }: ResultsGridProps) {
  const downloadImage = async (url: string, index: number) => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
    try {
      const res = await fetch(`${apiUrl}/proxy-image?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error("Failed to fetch image via proxy");
      const blob = await res.blob();

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `fabricviz-${POSE_LABELS[index].toLowerCase().replace(/\s/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (error) {
      console.error("Failed to download image", error);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {images.map((img, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative group rounded-lg overflow-hidden border bg-card aspect-[3/4]"
        >
          {img ? (
            <>
              <img src={img} alt={POSE_LABELS[i]} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
              <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={() => downloadImage(img, i)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <span className="absolute top-2 left-2 text-xs font-medium bg-background/80 backdrop-blur-sm rounded px-2 py-0.5">
                {POSE_LABELS[i]}
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              {status === "generating" ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">{POSE_LABELS[i]}</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">{POSE_LABELS[i]}</span>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
