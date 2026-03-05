import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AmPmTimePicker } from "@/components/AmPmTimePicker";
import { notificationService } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

export const JournalNotificationBell = () => {
  const [enabled, setEnabled] = useState(localStorage.getItem("dailynova_notify_journal") === "true");
  const [hour, setHour] = useState(localStorage.getItem("dailynova_journal_hour") || "21");
  const [minute, setMinute] = useState(localStorage.getItem("dailynova_journal_minute") || "0");
  const { toast } = useToast();

  const toggleEnabled = (v: boolean) => {
    localStorage.setItem("dailynova_notify_journal", String(v));
    setEnabled(v);
    notificationService.setupJournalReminder();
    toast({ title: v ? "Journal reminder on" : "Journal reminder off" });
  };

  const updateTime = (h: string, m: string) => {
    localStorage.setItem("dailynova_journal_hour", h);
    localStorage.setItem("dailynova_journal_minute", m);
    setHour(h);
    setMinute(m);
    notificationService.setupJournalReminder();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={enabled ? "text-secondary" : "text-muted-foreground"}>
          {enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">✍️ Journal Reminder</Label>
          <Switch checked={enabled} onCheckedChange={toggleEnabled} />
        </div>
        {enabled && (
          <AmPmTimePicker hour={hour} minute={minute} onTimeChange={updateTime} />
        )}
        <p className="text-xs text-muted-foreground">Daily reminder + follow-up 2hrs later. Uses your phone's default notification sound.</p>
      </PopoverContent>
    </Popover>
  );
};
