import { useState, useEffect } from "react";
import { Bell, Clock, Repeat, AlarmClock, X, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AmPmTimePicker } from "@/components/AmPmTimePicker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AlertLevel, DurationType, ReminderSound, RepeatUnit, Task, TaskDuration, TaskRepeat } from "@/lib/storage";
import { haptics } from "@/lib/haptics";

interface ReminderEditorProps {
  initialTitle?: string;
  initialTask?: Task | null;
  onCancel: () => void;
  onSave: (data: {
    title: string;
    dueDate: string;
    dueTime: string;
    repeat: TaskRepeat;
    duration: TaskDuration;
    alertLevel: AlertLevel;
    notificationSound: ReminderSound;
    snoozeMinutes: number;
  }) => void;
}

const REPEAT_UNITS: { value: RepeatUnit; label: string }[] = [
  { value: "none", label: "Don't repeat" },
  { value: "minute", label: "Every minute" },
  { value: "hour", label: "Every hour" },
  { value: "day", label: "Every day" },
  { value: "week", label: "Every week" },
  { value: "month", label: "Every month" },
  { value: "year", label: "Every year" },
];

const ALERT_LEVELS: { value: AlertLevel; label: string; desc: string }[] = [
  { value: "light", label: "Light", desc: "Banner only · one short sound · auto-dismiss" },
  { value: "medium", label: "Medium", desc: "Full-screen reminder · one short sound" },
  { value: "strong", label: "Strong", desc: "Full-screen reminder · repeats sound until snoozed/completed" },
];

const SOUND_OPTIONS: { value: ReminderSound; label: string; desc: string }[] = [
  { value: "gentle", label: "Daily Nova", desc: "Soft pink reminder tone" },
  { value: "classic", label: "Classic", desc: "Brighter short alert tone" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toHourStr = (d: Date) => String(d.getHours());
const toMinStr = (d: Date) => String(d.getMinutes());

/**
 * Samsung-style reminder editor: main reminder text, time, repeat, duration, sound, snooze, alert level.
 */
const ReminderEditor = ({ initialTitle = "", initialTask = null, onCancel, onSave }: ReminderEditorProps) => {
  const [title, setTitle] = useState(initialTask?.title || initialTitle);

  const now = new Date();
  const [date, setDate] = useState(initialTask?.dueDate || toDateStr(now));
  const [hour, setHour] = useState(initialTask?.dueTime ? String(parseInt(initialTask.dueTime.split(":")[0], 10)) : toHourStr(now));
  const [minute, setMinute] = useState(initialTask?.dueTime ? String(parseInt(initialTask.dueTime.split(":")[1], 10)) : toMinStr(now));

  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>(initialTask?.repeat?.unit || "none");
  const [repeatEvery, setRepeatEvery] = useState(initialTask?.repeat?.every || 1);

  const [durationType, setDurationType] = useState<DurationType>(initialTask?.duration?.type || "forever");
  const [durationCount, setDurationCount] = useState(initialTask?.duration?.count || 5);
  const [durationUntil, setDurationUntil] = useState(initialTask?.duration?.until || toDateStr(new Date(Date.now() + 7 * 86400000)));

  const [alertLevel, setAlertLevel] = useState<AlertLevel>(initialTask?.alertLevel || "light");
  const [notificationSound, setNotificationSound] = useState<ReminderSound>(initialTask?.notificationSound || "gentle");
  const [snoozeMinutes, setSnoozeMinutes] = useState(initialTask?.snoozeMinutes || 10);

  useEffect(() => {
    setTitle(initialTask?.title || initialTitle);
    setDate(initialTask?.dueDate || toDateStr(new Date()));
    setHour(initialTask?.dueTime ? String(parseInt(initialTask.dueTime.split(":")[0], 10)) : toHourStr(new Date()));
    setMinute(initialTask?.dueTime ? String(parseInt(initialTask.dueTime.split(":")[1], 10)) : toMinStr(new Date()));
    setRepeatUnit(initialTask?.repeat?.unit || "none");
    setRepeatEvery(initialTask?.repeat?.every || 1);
    setDurationType(initialTask?.duration?.type || "forever");
    setDurationCount(initialTask?.duration?.count || 5);
    setDurationUntil(initialTask?.duration?.until || toDateStr(new Date(Date.now() + 7 * 86400000)));
    setAlertLevel(initialTask?.alertLevel || "light");
    setNotificationSound(initialTask?.notificationSound || "gentle");
    setSnoozeMinutes(initialTask?.snoozeMinutes || 10);
  }, [initialTitle, initialTask]);

  const applyPreset = (preset: "1h" | "07" | "15" | "22") => {
    haptics.light();
    const d = new Date();
    if (preset === "1h") {
      d.setHours(d.getHours() + 1);
    } else if (preset === "07") {
      d.setHours(7, 0, 0, 0);
    } else if (preset === "15") {
      d.setHours(15, 0, 0, 0);
    } else if (preset === "22") {
      d.setHours(22, 0, 0, 0);
    }
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
    setDate(toDateStr(d));
    setHour(toHourStr(d));
    setMinute(toMinStr(d));
  };

  const handleSave = () => {
    if (!title.trim()) return;
    haptics.success();
    onSave({
      title: title.trim(),
      dueDate: date,
      dueTime: `${pad(parseInt(hour, 10))}:${pad(parseInt(minute, 10))}`,
      repeat: { unit: repeatUnit, every: Math.max(1, repeatEvery) },
      duration:
        durationType === "count"
          ? { type: "count", count: Math.max(1, durationCount) }
          : durationType === "until"
          ? { type: "until", until: durationUntil }
          : { type: "forever" },
      alertLevel,
      notificationSound,
      snoozeMinutes: Math.max(1, snoozeMinutes),
    });
  };

  return (
    <Card className="glass border-border/50 p-4 space-y-5 max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-sm font-medium text-muted-foreground">My reminders</span>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel} aria-label="Close">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Input
        autoFocus
        placeholder="Enter reminder…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-background/50 border-border/50 text-base font-medium"
      />

      {/* Time */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-secondary">
          <Clock className="w-4 h-4" /> Add time
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => applyPreset("1h")}>
            1 hour from now
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => applyPreset("07")}>
            Today 07:00
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => applyPreset("15")}>
            Today 15:00
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => applyPreset("22")}>
            Today 22:00
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background/50 border-border/50 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Time</Label>
            <AmPmTimePicker hour={hour} minute={minute} onTimeChange={(h, m) => { setHour(h); setMinute(m); }} />
          </div>
        </div>
      </section>

      {/* Repeat */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-secondary">
          <Repeat className="w-4 h-4" /> Repeat
        </div>
        <div className="flex gap-2">
          <Select value={repeatUnit} onValueChange={(v) => setRepeatUnit(v as RepeatUnit)}>
            <SelectTrigger className="bg-background/50 border-border/50 text-sm flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPEAT_UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {repeatUnit !== "none" && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Every</span>
              <Input
                type="number"
                min={1}
                value={repeatEvery}
                onChange={(e) => setRepeatEvery(parseInt(e.target.value, 10) || 1)}
                className="w-16 bg-background/50 border-border/50 text-sm"
              />
            </div>
          )}
        </div>
      </section>

      {/* Duration */}
      {repeatUnit !== "none" && (
        <section className="space-y-2">
          <div className="text-sm font-medium text-secondary">Duration</div>
          <RadioGroup value={durationType} onValueChange={(v) => setDurationType(v as DurationType)} className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="forever" id="dur-forever" />
              <Label htmlFor="dur-forever" className="text-sm">Forever</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="count" id="dur-count" />
              <Label htmlFor="dur-count" className="text-sm">Specific number of times</Label>
              {durationType === "count" && (
                <Input
                  type="number"
                  min={1}
                  value={durationCount}
                  onChange={(e) => setDurationCount(parseInt(e.target.value, 10) || 1)}
                  className="w-16 h-7 bg-background/50 border-border/50 text-sm"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="until" id="dur-until" />
              <Label htmlFor="dur-until" className="text-sm">Until</Label>
              {durationType === "until" && (
                <Input
                  type="date"
                  value={durationUntil}
                  onChange={(e) => setDurationUntil(e.target.value)}
                  className="h-7 bg-background/50 border-border/50 text-sm flex-1"
                />
              )}
            </div>
          </RadioGroup>
        </section>
      )}

      {/* Alert level */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-secondary">
          <AlarmClock className="w-4 h-4" /> Alert level
        </div>
        <RadioGroup value={alertLevel} onValueChange={(v) => setAlertLevel(v as AlertLevel)} className="space-y-2">
          {ALERT_LEVELS.map((a) => (
            <label key={a.value} className="flex items-start gap-2 cursor-pointer">
              <RadioGroupItem value={a.value} id={`alert-${a.value}`} className="mt-1" />
              <div>
                <div className="text-sm font-medium">{a.label}</div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-secondary">
            <Volume2 className="w-4 h-4" /> Sound
          </div>
          <Select value={notificationSound} onValueChange={(v) => setNotificationSound(v as ReminderSound)}>
            <SelectTrigger className="bg-background/50 border-border/50 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOUND_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">{SOUND_OPTIONS.find((s) => s.value === notificationSound)?.desc}</p>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-secondary">Snooze</div>
          <Select value={String(snoozeMinutes)} onValueChange={(v) => setSnoozeMinutes(parseInt(v, 10))}>
            <SelectTrigger className="bg-background/50 border-border/50 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">Used by full-screen reminders.</p>
        </div>
      </section>

      {/* Footer */}
      <div className="flex gap-2 pt-2 sticky bottom-0 bg-background/80 backdrop-blur -mx-4 -mb-4 px-4 py-3 border-t border-border/30">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 glow-purple" onClick={handleSave} disabled={!title.trim()}>Save</Button>
      </div>
    </Card>
  );
};

export default ReminderEditor;
