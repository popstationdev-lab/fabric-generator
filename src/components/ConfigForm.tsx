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
  GARMENT_TYPES,
  LIGHTINGS,
  BACKGROUNDS,
  FITS,
  UNITS,
  FabricType,
  GarmentType,
  Lighting,
  Background,
  Fit,
  MeasurementUnit,
} from "@/lib/types";
import { Input } from "@/components/ui/input";

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
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Garment Type</Label>
        <Select value={config.garmentType} onValueChange={(v) => update("garmentType", v as GarmentType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {GARMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Number of Generations</Label>
        <Select value={config.numGenerations.toString()} onValueChange={(v) => update("numGenerations", Number(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((n) => <SelectItem key={n} value={n.toString()}>{n} Image{n > 1 ? "s" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-2 grid grid-cols-3 gap-4 border-t pt-4 mt-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Repeat Width</Label>
          <Input
            type="number"
            placeholder="Width"
            value={config.repeatWidth || ""}
            onChange={(e) => update("repeatWidth", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Repeat Height</Label>
          <Input
            type="number"
            placeholder="Height"
            value={config.repeatHeight || ""}
            onChange={(e) => update("repeatHeight", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit</Label>
          <Select value={config.repeatUnit} onValueChange={(v) => update("repeatUnit", v as MeasurementUnit)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
