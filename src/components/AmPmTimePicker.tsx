import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AmPmTimePickerProps {
  hour: string;
  minute: string;
  onTimeChange: (hour: string, minute: string) => void;
  className?: string;
}

const to12 = (h24: number) => {
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return { h12, period };
};

const to24 = (h12: number, period: string) => {
  if (period === "AM") return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
};

export const AmPmTimePicker = ({ hour, minute, onTimeChange, className }: AmPmTimePickerProps) => {
  const h24 = parseInt(hour, 10) || 0;
  const { h12, period } = to12(h24);

  const handleHourChange = (val: string) => {
    onTimeChange(String(to24(parseInt(val), period)), minute);
  };

  const handleMinuteChange = (val: string) => {
    onTimeChange(hour, val);
  };

  const handlePeriodChange = (val: string) => {
    onTimeChange(String(to24(h12, val)), minute);
  };

  return (
    <div className={`flex items-center gap-1 ${className || ""}`}>
      <Select value={String(h12)} onValueChange={handleHourChange}>
        <SelectTrigger className="h-7 w-14 text-xs bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <SelectItem key={h} value={String(h)} className="text-xs">{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs">:</span>
      <Select value={String(parseInt(minute, 10))} onValueChange={handleMinuteChange}>
        <SelectTrigger className="h-7 w-14 text-xs bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
            <SelectItem key={m} value={String(m)} className="text-xs">{String(m).padStart(2, "0")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="h-7 w-16 text-xs bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM" className="text-xs">AM</SelectItem>
          <SelectItem value="PM" className="text-xs">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
