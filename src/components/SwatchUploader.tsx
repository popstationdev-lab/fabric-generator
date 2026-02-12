import { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SwatchUploaderProps {
  file: File | null;
  preview: string | null;
  onFileChange: (file: File | null, preview: string | null) => void;
}

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ACCEPTED = ["image/jpeg", "image/png"];

export function SwatchUploader({ file, preview, onFileChange }: SwatchUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const clear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    onFileChange(null, null);
    setError(null);
  }, [preview, onFileChange]);

  if (preview) {
    return (
      <div className="relative group">
        <div className="rounded-lg overflow-hidden border-2 border-primary/20 bg-card aspect-square max-w-[280px] mx-auto">
          <img src={preview} alt="Fabric swatch" className="w-full h-full object-cover" />
        </div>
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
          onClick={clear}
        >
          <X className="h-4 w-4" />
        </Button>
        <p className="text-sm text-muted-foreground text-center mt-2 truncate">{file?.name}</p>
      </div>
    );
  }

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-all duration-200 aspect-square max-w-[280px] mx-auto",
          dragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <div className="rounded-full bg-primary/10 p-3">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Drop your fabric swatch here</p>
          <p className="text-xs text-muted-foreground mt-1">JPG or PNG, max 8 MB</p>
        </div>
        <input type="file" accept=".jpg,.jpeg,.png" className="sr-only" onChange={onInputChange} />
      </label>
      {error && <p className="text-sm text-destructive mt-2 text-center">{error}</p>}
    </div>
  );
}
