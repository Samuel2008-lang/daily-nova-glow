import { useState } from "react";
import { Bell, BellOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { notificationService } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

export const DiaryNotificationBell = () => {
  const [enabled, setEnabled] = useState(localStorage.getItem("dailynova_notify_diary") === "true");
  const [hour, setHour] = useState(localStorage.getItem("dailynova_diary_hour") || "21");
  const [minute, setMinute] = useState(localStorage.getItem("dailynova_diary_minute") || "0");
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={enabled ? "text-success" : "text-muted-foreground"}>
          {enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">📖 Diary Reminder</Label>
          <Switch checked={enabled} onCheckedChange={toggleEnabled} />
        </div>
        {enabled && (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <select className="bg-background border border-border rounded px-2 py-1 text-xs" value={hour}
              onChange={(e) => updateTime(e.target.value, minute)}>
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{String(i).padStart(2, "0")}</option>)}
            </select>
            <span className="text-xs">:</span>
            <select className="bg-background border border-border rounded px-2 py-1 text-xs" value={minute}
              onChange={(e) => updateTime(hour, e.target.value)}>
              {[0, 15, 30, 45].map(m => <option key={m} value={String(m)}>{String(m).padStart(2, "0")}</option>)}
            </select>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Daily reminder + follow-up 2hrs later.</p>
      </PopoverContent>
    </Popover>
  );
};
