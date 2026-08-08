import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Star, Camera, ListChecks, Clock, Repeat as RepeatIcon, AlarmClock, Volume2, Mic, Tag, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AmPmTimePicker } from "@/components/AmPmTimePicker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import type { AlertLevel, ChecklistItem, DurationType, ReminderSound, RepeatUnit, Task, TaskLocation } from "@/lib/storage";
import { haptics } from "@/lib/haptics";
import { REMINDER_CATEGORIES, REMINDER_COLORS } from "@/lib/reminder-constants";
import { reminderImages } from "@/lib/reminder-images";
import ImageStrip from "@/components/reminders/ImageStrip";
import ImagePickerSheet from "@/components/reminders/ImagePickerSheet";
import LocationPanel from "@/components/reminders/LocationPanel";
import RichTextToolbar from "@/components/reminders/RichTextToolbar";
import { plainText } from "@/lib/rich-text";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

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
  { value: "light", label: "Light", desc: "Banner + short sound. Minimal disruption." },
  { value: "medium", label: "Medium", desc: "Full-screen alert + short sound with actions." },
  { value: "strong", label: "Strong", desc: "Full-screen alarm that sounds until dismissed." },
];

const SOUND_OPTIONS: { value: ReminderSound; label: string }[] = [
  { value: "gentle", label: "Nova (soft)" },
  { value: "classic", label: "Classic (bright)" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export interface ReminderEditorPayload {
  title: string;
  memo?: string;
  important: boolean;
  color?: string;
  category?: string;
  checklist?: ChecklistItem[];
  imageIds: string[];
  location?: TaskLocation;
  dueDate?: string;
  dueTime?: string;
  repeat: { unit: RepeatUnit; every: number };
  duration: { type: DurationType; count?: number; until?: string };
  alertLevel: AlertLevel;
  notificationSound: ReminderSound;
  snoozeMinutes: number;
}

interface Props {
  initialTitle?: string;
  initialTask?: Task | null;
  onCancel: () => void;
  onSave: (data: ReminderEditorPayload) => void | Promise<void>;
}

const ReminderEditor = ({ initialTitle = "", initialTask = null, onCancel, onSave }: Props) => {
  const isEdit = !!initialTask;
  const now = new Date();

  const [memo, setMemo] = useState(initialTask?.memo || initialTask?.title || initialTitle);
  const [important, setImportant] = useState(!!initialTask?.important);
  const [color, setColor] = useState<string>(initialTask?.color || REMINDER_COLORS[0].id);
  const [category, setCategory] = useState<string>(initialTask?.category || "");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialTask?.checklist || []);
  const [showChecklist, setShowChecklist] = useState((initialTask?.checklist?.length || 0) > 0);
  const [imageIds, setImageIds] = useState<string[]>(initialTask?.imageIds || []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [location, setLocation] = useState<TaskLocation | undefined>(initialTask?.location);
  const memoRef = useRef<HTMLTextAreaElement>(null);

  const [timeEnabled, setTimeEnabled] = useState(!!initialTask?.dueDate);
  const [date, setDate] = useState(initialTask?.dueDate || toDateStr(now));
  const [hour, setHour] = useState(
    initialTask?.dueTime ? String(parseInt(initialTask.dueTime.split(":")[0], 10)) : String(now.getHours())
  );
  const [minute, setMinute] = useState(
    initialTask?.dueTime ? String(parseInt(initialTask.dueTime.split(":")[1], 10)) : String(now.getMinutes())
  );

  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>(initialTask?.repeat?.unit || "none");
  const [repeatEvery, setRepeatEvery] = useState(initialTask?.repeat?.every || 1);

  const [durationType, setDurationType] = useState<DurationType>(initialTask?.duration?.type || "forever");
  const [durationCount, setDurationCount] = useState(initialTask?.duration?.count || 5);
  const [durationUntil, setDurationUntil] = useState(
    initialTask?.duration?.until || toDateStr(new Date(Date.now() + 7 * 86400000))
  );

  const [alertLevel, setAlertLevel] = useState<AlertLevel>(initialTask?.alertLevel || "light");
  const [notificationSound, setNotificationSound] = useState<ReminderSound>(initialTask?.notificationSound || "gentle");
  const [snoozeMinutes, setSnoozeMinutes] = useState(initialTask?.snoozeMinutes || 10);

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: (t) => setMemo((prev) => (prev ? prev + " " + t : t)),
  });

  useEffect(() => {
    // Prevent body scroll while modal-style editor is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const applyPreset = (preset: "1h" | "07" | "12" | "18" | "22") => {
    haptics.light();
    setTimeEnabled(true);
    const d = new Date();
    if (preset === "1h") d.setTime(d.getTime() + 60 * 60 * 1000);
    else if (preset === "07") d.setHours(7, 0, 0, 0);
    else if (preset === "12") d.setHours(12, 0, 0, 0);
    else if (preset === "18") d.setHours(18, 0, 0, 0);
    else if (preset === "22") d.setHours(22, 0, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
    setDate(toDateStr(d));
    setHour(String(d.getHours()));
    setMinute(String(d.getMinutes()));
  };

  const addChecklistItem = () => {
    setChecklist((c) => [...c, { id: `c_${Date.now()}`, text: "", done: false }]);
    setShowChecklist(true);
  };

  const handleSave = async () => {
    if (!memo.trim()) return;
    haptics.success();
    const payload: ReminderEditorPayload = {
      title: plainText(memo.trim()).split("\n")[0].slice(0, 200),
      memo: memo.trim(),
      important,
      color,
      category: category || undefined,
      checklist: checklist.filter((c) => c.text.trim()),
      imageIds,
      location,
      dueDate: timeEnabled ? date : undefined,
      dueTime: timeEnabled ? `${pad(parseInt(hour, 10))}:${pad(parseInt(minute, 10))}` : undefined,
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
    };
    await onSave(payload);
    // clean up removed images on edit
    if (isEdit) {
      const removed = (initialTask?.imageIds || []).filter((id) => !imageIds.includes(id));
      reminderImages.removeMany(removed);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-3 py-3 border-b border-border/40 bg-background/95 backdrop-blur">
        <Button size="icon" variant="ghost" onClick={onCancel} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">{isEdit ? "Edit reminder" : "New reminder"}</h1>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => { haptics.light(); setImportant((v) => !v); }}
          aria-label="Mark important"
          className={important ? "text-primary" : "text-muted-foreground"}
        >
          <Star className={`w-5 h-5 ${important ? "fill-primary" : ""}`} />
        </Button>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="px-4 py-5 space-y-6 max-w-xl mx-auto">
          {/* Memo */}
          <section>
            <div className="relative">
              <Textarea
                autoFocus
                ref={memoRef}
                placeholder="What do you want to remember?"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="min-h-[110px] text-lg leading-relaxed bg-background border-border/40 focus-visible:ring-1 pr-12"
              />
              {isSupported && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => (isListening ? stopListening() : startListening(false, "task"))}
                  className={`absolute top-2 right-2 ${isListening ? "text-primary animate-pulse" : "text-muted-foreground"}`}
                  aria-label={isListening ? "Stop voice" : "Start voice"}
                >
                  <Mic className="w-4 h-4" />
                </Button>
              )}
            </div>

            <RichTextToolbar targetRef={memoRef} value={memo} onChange={setMemo} />


            {/* Attachments row */}
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setPickerOpen(true)}>
                <Camera className="w-4 h-4" /> Photo
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { setShowChecklist(true); if (!checklist.length) addChecklistItem(); }}>
                <ListChecks className="w-4 h-4" /> Checklist
              </Button>
            </div>

            {(imageIds.length > 0) && (
              <div className="mt-3">
                <ImageStrip
                  ids={imageIds}
                  onRemove={(id) => setImageIds((ids) => ids.filter((x) => x !== id))}
                  onAdd={() => setPickerOpen(true)}
                />
              </div>
            )}
          </section>

          {/* Checklist */}
          <Collapsible open={showChecklist}>
            <CollapsibleContent>
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Checklist</Label>
                  <Button size="sm" variant="ghost" onClick={addChecklistItem} className="gap-1 h-7">
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {checklist.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={(v) =>
                          setChecklist((cs) => cs.map((c) => (c.id === item.id ? { ...c, done: !!v } : c)))
                        }
                      />
                      <Input
                        value={item.text}
                        placeholder={`Item ${idx + 1}`}
                        onChange={(e) =>
                          setChecklist((cs) => cs.map((c) => (c.id === item.id ? { ...c, text: e.target.value } : c)))
                        }
                        className="bg-background border-border/40 flex-1 h-9"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setChecklist((cs) => cs.filter((c) => c.id !== item.id))}
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            </CollapsibleContent>
          </Collapsible>

          {/* Color */}
          <section>
            <Label className="text-sm text-muted-foreground mb-2 block">Color</Label>
            <div className="flex gap-2">
              {REMINDER_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { haptics.light(); setColor(c.id); }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c.id ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c.value }}
                  aria-label={c.label}
                />
              ))}
            </div>
          </section>

          {/* Category */}
          <section>
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span>Category</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {REMINDER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(category === cat ? "" : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    category === cat
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {/* Time */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Add time</span>
              </div>
              <button
                type="button"
                onClick={() => setTimeEnabled((v) => !v)}
                className={`text-xs px-2 py-1 rounded-full border ${timeEnabled ? "border-primary text-primary" : "border-border/60 text-muted-foreground"}`}
              >
                {timeEnabled ? "On" : "Off"}
              </button>
            </div>
            {timeEnabled && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: "1h", label: "In 1 hour" },
                    { k: "07", label: "07:00" },
                    { k: "12", label: "12:00" },
                    { k: "18", label: "18:00" },
                    { k: "22", label: "22:00" },
                  ].map((p) => (
                    <Button key={p.k} size="sm" variant="outline" className="text-xs h-8" onClick={() => applyPreset(p.k as any)}>
                      {p.label}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background border-border/40 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Time</Label>
                    <AmPmTimePicker hour={hour} minute={minute} onTimeChange={(h, m) => { setHour(h); setMinute(m); }} />
                  </div>
                </div>

                {/* Repeat */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <RepeatIcon className="w-4 h-4 text-muted-foreground" /> Repeat
                  </div>
                  <div className="flex gap-2">
                    <Select value={repeatUnit} onValueChange={(v) => setRepeatUnit(v as RepeatUnit)}>
                      <SelectTrigger className="bg-background border-border/40 text-sm flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPEAT_UNITS.map((u) => (<SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    {repeatUnit !== "none" && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Every</span>
                        <Input type="number" min={1} value={repeatEvery} onChange={(e) => setRepeatEvery(parseInt(e.target.value, 10) || 1)} className="w-16 bg-background border-border/40 text-sm" />
                      </div>
                    )}
                  </div>
                </div>

                {repeatUnit !== "none" && (
                  <div>
                    <div className="text-sm font-medium mb-2">Duration</div>
                    <RadioGroup value={durationType} onValueChange={(v) => setDurationType(v as DurationType)} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="forever" id="dur-forever" />
                        <Label htmlFor="dur-forever" className="text-sm">Forever</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="count" id="dur-count" />
                        <Label htmlFor="dur-count" className="text-sm">Times</Label>
                        {durationType === "count" && (
                          <Input type="number" min={1} value={durationCount} onChange={(e) => setDurationCount(parseInt(e.target.value, 10) || 1)} className="w-16 h-7 bg-background border-border/40 text-sm" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="until" id="dur-until" />
                        <Label htmlFor="dur-until" className="text-sm">Until</Label>
                        {durationType === "until" && (
                          <Input type="date" value={durationUntil} onChange={(e) => setDurationUntil(e.target.value)} className="h-7 bg-background border-border/40 text-sm flex-1" />
                        )}
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Place (offline geofence) */}
          <LocationPanel value={location} onChange={setLocation} />



          {/* Alert style */}
          <section>
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <AlarmClock className="w-4 h-4 text-muted-foreground" /> Alert style
            </div>
            <RadioGroup value={alertLevel} onValueChange={(v) => setAlertLevel(v as AlertLevel)} className="space-y-2">
              {ALERT_LEVELS.map((a) => (
                <label key={a.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${alertLevel === a.value ? "border-primary bg-primary/5" : "border-border/40"}`}>
                  <RadioGroupItem value={a.value} id={`alert-${a.value}`} className="mt-1" />
                  <div>
                    <div className="text-sm font-medium">{a.label}</div>
                    <div className="text-xs text-muted-foreground">{a.desc}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </section>

          {/* Sound + snooze */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" /> Sound
              </div>
              <Select value={notificationSound} onValueChange={(v) => setNotificationSound(v as ReminderSound)}>
                <SelectTrigger className="bg-background border-border/40 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOUND_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Snooze</div>
              <Select value={String(snoozeMinutes)} onValueChange={(v) => setSnoozeMinutes(parseInt(v, 10))}>
                <SelectTrigger className="bg-background border-border/40 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 30, 60].map((m) => (<SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-t border-border/40 px-4 py-3">
        <div className="max-w-xl mx-auto flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={!memo.trim()}>Save</Button>
        </div>
      </div>

      <ImagePickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPicked={(imgs) => setImageIds((ids) => [...ids, ...imgs.map((i) => i.id)].slice(0, 10))}
      />
    </div>
  );
};

export default ReminderEditor;
