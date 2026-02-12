import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PromptEditor({ value, onChange }: PromptEditorProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Generation Prompt
        </Label>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[100px] text-sm leading-relaxed resize-none"
        placeholder="Describe the product image you want to generate..."
      />
      <p className="text-xs text-muted-foreground">
        Auto-generated from your settings. Edit freely before generating.
      </p>
    </div>
  );
}
