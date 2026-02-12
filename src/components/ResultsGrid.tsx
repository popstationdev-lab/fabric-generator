import { Download, Loader2, Wand2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ResultsGridProps {
  images: (string | null)[];
  status: "idle" | "generating" | "done" | "error";
  onEdit?: (url: string, index: number) => void;
}

const POSE_LABELS = ["Front View", "Three-Quarter", "Side Profile", "Back View"];

export function ResultsGrid({ images, status, onEdit }: ResultsGridProps) {
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

  const viewImage = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {images.map((url, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="space-y-3 group"
        >
          <div className="aspect-[3/4] relative rounded-xl overflow-hidden border bg-muted/30 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-primary/20">
            {url ? (
              <>
                <img
                  src={url}
                  alt={`View ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 rounded-full shadow-lg hover:scale-110 transition-transform"
                    onClick={() => viewImage(url)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {onEdit && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-9 w-9 rounded-full shadow-lg hover:scale-110 transition-transform"
                      onClick={() => onEdit?.(url, index)}
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 rounded-full shadow-lg hover:scale-110 transition-transform"
                    onClick={() => downloadImage(url, index)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                {status === "generating" ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Processing...</span>
                  </>
                ) : (
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Waiting...</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{POSE_LABELS[index]}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
