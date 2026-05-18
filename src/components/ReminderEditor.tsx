import { useState, useEffect } from "react";
import { Bell, Clock, Repeat, AlarmClock, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AmPmTimePicker } from "@/components/AmPmTimePicker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AlertLevel, DurationType, RepeatUnit, Task, TaskDuration, TaskRepeat } from "@/lib/storage";
import { haptics } from "@/lib/haptics";

interface ReminderEditorProps {
  initialTitle?: string;
  onCancel: () => void;
  onSave: (data: {
    title: string;
    memo?: string;
    dueDate: string;
    dueTime: string;
    repeat: TaskRepeat;
    duration: TaskDuration;
    alertLevel: AlertLevel;
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
  { value: "light", label: "Light", desc: "Notification + short sound" },
  { value: "medium", label: "Medium", desc: "Full-screen alert + short sound" },
  { value: "strong", label: "Strong", desc: "Full-screen alert + long sound" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toHourStr = (d: Date) => String(d.getHours());
const toMinStr = (d: Date) => String(d.getMinutes());

/**
 * Samsung-style reminder editor: memo, time, repeat, duration, alert level.
 */
const ReminderEditor = ({ initialTitle = "", onCancel, onSave }: ReminderEditorProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [memo, setMemo] = useState("");

  const now = new Date();
  const [date, setDate] = useState(toDateStr(now));
  const [hour, setHour] = useState(toHourStr(now));
  const [minute, setMinute] = useState(toMinStr(now));

  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>("none");
  const [repeatEvery, setRepeatEvery] = useState(1);

  const [durationType, setDurationType] = useState<DurationType>("forever");
  const [durationCount, setDurationCount] = useState(5);
  const [durationUntil, setDurationUntil] = useState(toDateStr(new Date(Date.now() + 7 * 86400000)));

  const [alertLevel, setAlertLevel] = useState<AlertLevel>("light");

  useEffect(() => setTitle(initialTitle), [initialTitle]);

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
      memo: memo.trim() || undefined,
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

      <Textarea
        placeholder="Add memo (optional)"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        className="bg-background/50 border-border/50 text-sm min-h-[60px]"
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

      {/* Footer */}
      <div className="flex gap-2 pt-2 sticky bottom-0 bg-background/80 backdrop-blur -mx-4 -mb-4 px-4 py-3 border-t border-border/30">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 glow-purple" onClick={handleSave} disabled={!title.trim()}>Save</Button>
      </div>
    </Card>
  );
};

export default ReminderEditor;
