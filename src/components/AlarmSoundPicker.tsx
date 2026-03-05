import { Volume2 } from "lucide-react";
import { Label } from "@/components/ui/label";

/**
 * Native alarm sound info component.
 * On Android, Capacitor Local Notifications uses the device's default
 * notification sound automatically. Users can change notification sounds
 * in their phone's system Settings > Apps > Notifications.
 * 
 * This component simply informs the user of that behavior.
 */

interface AlarmSoundPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  compact?: boolean;
}

export const AlarmSoundPicker = ({ compact }: AlarmSoundPickerProps) => {
  return (
    <div className="flex items-center gap-2">
      <Volume2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      <span className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground`}>
        Uses your phone's default notification sound
      </span>
    </div>
  );
};
