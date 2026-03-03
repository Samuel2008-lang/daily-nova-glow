import { Volume2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const ALARM_SOUNDS = [
  { label: "Default", value: "default" },
  { label: "Gentle Bell", value: "gentle_bell" },
  { label: "Classic Alarm", value: "classic_alarm" },
  { label: "Digital Beep", value: "digital_beep" },
  { label: "Soft Chime", value: "soft_chime" },
  { label: "Urgent Ring", value: "urgent_ring" },
];

interface AlarmSoundPickerProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

export const AlarmSoundPicker = ({ value, onChange, compact }: AlarmSoundPickerProps) => {
  return (
    <div>
      {!compact && (
        <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
          <Volume2 className="w-3 h-3" /> Alarm Sound
        </Label>
      )}
      <div className="flex items-center gap-1">
        {compact && <Volume2 className="w-3 h-3 text-muted-foreground" />}
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={`${compact ? "h-7 text-xs w-28" : "h-8 text-xs"} bg-background border-border`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALARM_SOUNDS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
