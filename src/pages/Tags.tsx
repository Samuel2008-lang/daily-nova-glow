import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Tag as TagIcon, Plus, Trash2, FileText, CheckSquare, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { haptics } from "@/lib/haptics";
import { storage } from "@/lib/storage";

const TAGS_KEY = "dailynova_tags";

const readTags = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(TAGS_KEY) || "[]");
  } catch {
    return [];
  }
};
const writeTags = (tags: string[]) => localStorage.setItem(TAGS_KEY, JSON.stringify(tags));

const Tags = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [active, setActive] = useState<string | null>(null);

  const notes = storage.getNotes();
  const tasks = storage.getTasks();
  const habits = storage.getHabits();

  // Tags = saved tags plus every category already used by an item.
  useEffect(() => {
    const used = [...notes, ...tasks, ...habits]
      .map((item) => (item as { category?: string }).category?.trim())
      .filter((c): c is string => !!c);
    const merged = Array.from(new Set([...readTags(), ...used])).sort((a, b) => a.localeCompare(b));
    setTags(merged);
    writeTags(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, { notes: number; tasks: number; habits: number }> = {};
    for (const tag of tags) {
      map[tag] = {
        notes: notes.filter((n) => n.category === tag).length,
        tasks: tasks.filter((t) => t.category === tag).length,
        habits: habits.filter((h) => h.category === tag).length,
      };
    }
    return map;
  }, [tags, notes, tasks, habits]);

  const addTag = () => {
    const name = newTag.trim();
    if (!name) return;
    if (tags.some((t) => t.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Tag already exists" });
      return;
    }
    haptics.light();
    const next = [...tags, name].sort((a, b) => a.localeCompare(b));
    setTags(next);
    writeTags(next);
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    haptics.light();
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    writeTags(next);
    if (active === tag) setActive(null);
  };

  const filteredNotes = active ? notes.filter((n) => n.category === active) : [];
  const filteredTasks = active ? tasks.filter((t) => t.category === active) : [];
  const filteredHabits = active ? habits.filter((h) => h.category === active) : [];
  const totalForActive = filteredNotes.length + filteredTasks.length + filteredHabits.length;

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-28">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <TagIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Tags</h1>
        </div>

        <Card className="glass p-4 mb-5">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="New tag name…"
              className="bg-background/50"
            />
            <Button onClick={addTag} disabled={!newTag.trim()} className="gap-1 shrink-0">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </Card>

        {tags.length === 0 ? (
          <Card className="glass p-8 text-center text-muted-foreground text-sm">
            No tags yet. Create one above, then assign it to a note, task, or habit.
          </Card>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => {
              const c = counts[tag] || { notes: 0, tasks: 0, habits: 0 };
              const total = c.notes + c.tasks + c.habits;
              const isActive = active === tag;
              return (
                <Card
                  key={tag}
                  className={`glass p-4 cursor-pointer transition-colors ${isActive ? "border-primary/60" : ""}`}
                  onClick={() => setActive(isActive ? null : tag)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{tag}</p>
                      <p className="text-xs text-muted-foreground">{total} item{total === 1 ? "" : "s"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="gap-1"><FileText className="w-3 h-3" />{c.notes}</Badge>
                      <Badge variant="secondary" className="gap-1"><CheckSquare className="w-3 h-3" />{c.tasks}</Badge>
                      <Badge variant="secondary" className="gap-1"><Target className="w-3 h-3" />{c.habits}</Badge>
                      <button
                        aria-label={`Delete ${tag}`}
                        onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                        className="p-2 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isActive && (
                    <div className="mt-4 space-y-3 border-t border-border/40 pt-3">
                      {totalForActive === 0 && (
                        <p className="text-xs text-muted-foreground">Nothing uses this tag yet.</p>
                      )}
                      {filteredNotes.map((n) => (
                        <button key={n.id} onClick={(e) => { e.stopPropagation(); navigate("/notes"); }} className="w-full text-left text-sm flex items-center gap-2 hover:text-primary">
                          <FileText className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{n.topic || n.content}</span>
                        </button>
                      ))}
                      {filteredTasks.map((t) => (
                        <button key={t.id} onClick={(e) => { e.stopPropagation(); navigate("/tasks"); }} className="w-full text-left text-sm flex items-center gap-2 hover:text-primary">
                          <CheckSquare className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{t.memo || t.title}</span>
                        </button>
                      ))}
                      {filteredHabits.map((h) => (
                        <button key={h.id} onClick={(e) => { e.stopPropagation(); navigate("/habits"); }} className="w-full text-left text-sm flex items-center gap-2 hover:text-primary">
                          <Target className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{h.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tags;
