import { useCallback, useState, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Link as LinkIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImageSelectorProps {
  file: File | string | null;
  preview: string | null;
  onFileChange: (file: File | string | null, preview: string | null) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  aspectRatio?: string;
}

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ACCEPTED = ["image/jpeg", "image/png"];

export function ImageSelector({
  file,
  preview,
  onFileChange,
  label = "Upload Image",
  description = "JPG or PNG, max 8 MB",
  placeholder = "Drop, Paste, or Upload",
  aspectRatio = "aspect-square"
}: ImageSelectorProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");

  const validate = useCallback((f: File): string | null => {
    if (!ACCEPTED.includes(f.type)) return "Only JPG and PNG files are accepted.";
    if (f.size > MAX_SIZE) return "File must be under 8 MB.";
    return null;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      const err = validate(f);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      const url = URL.createObjectURL(f);
      onFileChange(f, url);
    },
    [validate, onFileChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleUrlSubmit = useCallback(async (url: string) => {
    if (!url.startsWith('http')) {
      setError("Please enter a valid image URL.");
      return;
    }
    setError(null);
    onFileChange(url, url);
    setUrlInput("");
  }, [onFileChange]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Find the closest parent of the active element to see if it's THIS image selector
      // Simple check: if this preview exists, we're already "filled" so don't paste.
      // But we need a better way if multiple selectors exist. 
      // For now, simple logic: if focuses or hover? 
      // Actually, standard paste usually targets the last clicked selector.
      if (preview) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const f = items[i].getAsFile();
          if (f) handleFile(f);
          return;
        }
        if (items[i].type === "text/plain") {
          items[i].getAsString((text) => {
            if (text.startsWith("http") && (text.match(/\.(jpeg|jpg|png|webp)/i) || text.includes("supabase.co"))) {
              handleUrlSubmit(text);
            }
          });
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [preview, handleFile, handleUrlSubmit]);

  const clear = useCallback(() => {
    if (preview && typeof file !== 'string') URL.revokeObjectURL(preview);
    onFileChange(null, null);
    setError(null);
  }, [preview, file, onFileChange]);

  if (preview) {
    return (
      <div className="relative group">
        <div className={cn("rounded-lg overflow-hidden border-2 border-primary/20 bg-card max-w-[280px] mx-auto", aspectRatio)}>
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        </div>
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
          onClick={clear}
        >
          <X className="h-4 w-4" />
        </Button>
        <p className="text-sm text-muted-foreground text-center mt-2 truncate">
          {typeof file === 'string' ? 'Image from URL' : file?.name}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-all duration-200 max-w-[280px] mx-auto relative group",
          aspectRatio,
          dragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <div className="rounded-full bg-primary/10 p-3 group-hover:scale-110 transition-transform">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center px-4">
          <p className="text-sm font-medium">{placeholder}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <input type="file" accept=".jpg,.jpeg,.png" className="sr-only" onChange={onInputChange} />
      </label>

      <div className="flex items-center gap-2 max-w-[280px] mx-auto">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Paste image URL..."
            className="pl-8 h-9 text-xs"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUrlSubmit(urlInput);
            }}
          />
        </div>
        <Button size="sm" variant="secondary" className="h-9 px-3" onClick={() => handleUrlSubmit(urlInput)}>
          Add
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mt-2 text-center animate-in fade-in slide-in-from-top-1">{error}</p>}
    </div>
  );
}
