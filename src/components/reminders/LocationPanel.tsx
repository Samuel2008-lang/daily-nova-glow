import { useState } from "react";
import { MapPin, LocateFixed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { TaskLocation } from "@/lib/storage";
import { getCurrentPosition } from "@/lib/geo-reminders";
import { haptics } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";

interface Props {
  value?: TaskLocation;
  onChange: (loc: TaskLocation | undefined) => void;
}

const LocationPanel = ({ value, onChange }: Props) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const enabled = !!value;

  const useCurrent = async () => {
    setLoading(true);
    const pos = await getCurrentPosition();
    setLoading(false);
    if (!pos) {
      toast({ title: "Location unavailable", description: "Allow location access to use place reminders.", variant: "destructive" });
      return;
    }
    haptics.success();
    onChange({
      lat: pos.lat,
      lng: pos.lng,
      radius: value?.radius || 150,
      trigger: value?.trigger || "arrive",
      label: value?.label || "Current place",
      everyTime: value?.everyTime ?? true,
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span>Add place</span>
        </div>
        <button
          type="button"
          onClick={() => (enabled ? onChange(undefined) : useCurrent())}
          className={`text-xs px-2 py-1 rounded-full border ${enabled ? "border-primary text-primary" : "border-border/60 text-muted-foreground"}`}
        >
          {enabled ? "On" : "Off"}
        </button>
      </div>

      {enabled && (
        <div className="space-y-4 rounded-lg border border-border/40 p-3">
          <div>
            <Label className="text-xs text-muted-foreground">Place name</Label>
            <Input
              value={value!.label || ""}
              placeholder="Home, Office, Gym…"
              onChange={(e) => onChange({ ...value!, label: e.target.value })}
              className="bg-background border-border/40 text-sm"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {value!.lat.toFixed(5)}, {value!.lng.toFixed(5)}
            </p>
            <Button size="sm" variant="outline" className="gap-1 h-8" onClick={useCurrent} disabled={loading}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
              Use current
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["arrive", "leave"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ ...value!, trigger: t })}
                className={`py-2 rounded-lg text-xs border transition-colors ${
                  value!.trigger === t ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground"
                }`}
              >
                {t === "arrive" ? "When I arrive" : "When I leave"}
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">Radius</Label>
              <span className="text-xs text-foreground">{value!.radius} m</span>
            </div>
            <Slider
              value={[value!.radius]}
              min={50}
              max={1000}
              step={50}
              onValueChange={([v]) => onChange({ ...value!, radius: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Every time</p>
              <p className="text-xs text-muted-foreground">Off = remind once, then complete</p>
            </div>
            <Switch
              checked={value!.everyTime !== false}
              onCheckedChange={(v) => onChange({ ...value!, everyTime: v })}
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Uses your device GPS only. Nothing is uploaded.
          </p>
        </div>
      )}
    </section>
  );
};

export default LocationPanel;
