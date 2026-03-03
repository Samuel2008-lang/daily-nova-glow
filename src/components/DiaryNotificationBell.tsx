import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AmPmTimePicker } from "@/components/AmPmTimePicker";
import { AlarmSoundPicker } from "@/components/AlarmSoundPicker";
import { notificationService } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

export const DiaryNotificationBell = () => {
  const [enabled, setEnabled] = useState(localStorage.getItem("dailynova_notify_diary") === "true");
  const [hour, setHour] = useState(localStorage.getItem("dailynova_diary_hour") || "21");
  const [minute, setMinute] = useState(localStorage.getItem("dailynova_diary_minute") || "0");
  const [sound, setSound] = useState(localStorage.getItem("dailynova_diary_sound") || "default");
  const { toast } = useToast();

  const toggleEnabled = (v: boolean) => {
    localStorage.setItem("dailynova_notify_diary", String(v));
    setEnabled(v);
    notificationService.setupDiaryReminder();
    toast({ title: v ? "Diary reminder on" : "Diary reminder off" });
  };

  const updateTime = (h: string, m: string) => {
    localStorage.setItem("dailynova_diary_hour", h);
    localStorage.setItem("dailynova_diary_minute", m);
    setHour(h);
    setMinute(m);
    notificationService.setupDiaryReminder();
  };

  const updateSound = (s: string) => {
    localStorage.setItem("dailynova_diary_sound", s);
    setSound(s);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={enabled ? "text-success" : "text-muted-foreground"}>
          {enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">📖 Diary Reminder</Label>
          <Switch checked={enabled} onCheckedChange={toggleEnabled} />
        </div>
        {enabled && (
          <>
            <AmPmTimePicker hour={hour} minute={minute} onTimeChange={updateTime} />
            <AlarmSoundPicker value={sound} onChange={updateSound} compact />
          </>
        )}
        <p className="text-xs text-muted-foreground">Daily reminder + follow-up 2hrs later.</p>
      </PopoverContent>
    </Popover>
  );
};
