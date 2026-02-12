import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  FormConfig,
  FABRIC_TYPES,
  LIGHTINGS,
  BACKGROUNDS,
  FITS,
  FabricType,
  Lighting,
  Background,
  Fit,
} from "@/lib/types";

interface ConfigFormProps {
  config: FormConfig;
  onChange: (config: FormConfig) => void;
}

export function ConfigForm({ config, onChange }: ConfigFormProps) {
  const update = <K extends keyof FormConfig>(key: K, value: FormConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fabric Type</Label>
        <Select value={config.fabricType} onValueChange={(v) => update("fabricType", v as FabricType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {FABRIC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lighting</Label>
        <Select value={config.lighting} onValueChange={(v) => update("lighting", v as Lighting)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {LIGHTINGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Background</Label>
        <Select value={config.background} onValueChange={(v) => update("background", v as Background)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {BACKGROUNDS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fit</Label>
        <Select value={config.fit} onValueChange={(v) => update("fit", v as Fit)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {FITS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-2 space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</Label>
        <div className="flex h-10 w-full items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
          Male (V1)
        </div>
      </div>
    </div>
  );
}
