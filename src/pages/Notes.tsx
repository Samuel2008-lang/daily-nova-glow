import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { storage, Note } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setNotes(storage.getNotes());
  }, []);

  const addNote = () => {
    if (!newNote.trim()) return;

    const note: Note = {
      id: Date.now().toString(),
      content: newNote,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedNotes = [note, ...notes];
    setNotes(updatedNotes);
    storage.saveNotes(updatedNotes);
    setNewNote("");
    
    toast({
      title: "Note added",
      description: "Your note has been saved successfully.",
    });
  };

  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter((note) => note.id !== id);
    setNotes(updatedNotes);
    storage.saveNotes(updatedNotes);
    
    toast({
      title: "Note deleted",
      description: "Your note has been removed.",
    });
  };

  const updateNote = (id: string, content: string) => {
    const updatedNotes = notes.map((note) =>
      note.id === id ? { ...note, content, updatedAt: new Date().toISOString() } : note
    );
    setNotes(updatedNotes);
    storage.saveNotes(updatedNotes);
    setEditingId(null);
    
    toast({
      title: "Note updated",
      description: "Your changes have been saved.",
    });
  };

  const filteredNotes = notes.filter((note) =>
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-bold mb-8 text-primary">Notes</h1>

        {/* Add Note */}
        <Card className="glass glow p-6 mb-8">
          <Textarea
            placeholder="Write your note here..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="mb-4 min-h-[120px] bg-background/50 border-border/50 focus:border-primary"
          />
          <Button onClick={addNote} className="w-full glow">
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </Card>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-border/50 focus:border-primary"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <Card className="glass p-8 text-center">
              <p className="text-muted-foreground">No notes yet. Create your first note!</p>
            </Card>
          ) : (
            filteredNotes.map((note) => (
              <Card key={note.id} className="glass glow p-6 group">
                {editingId === note.id ? (
                  <div>
                    <Textarea
                      defaultValue={note.content}
                      className="mb-4 min-h-[120px] bg-background/50 border-border/50"
                      onBlur={(e) => updateNote(note.id, e.target.value)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-foreground mb-2 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingId(note.id)}
                        className="hover:text-primary"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteNote(note.id)}
                        className="hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes;
