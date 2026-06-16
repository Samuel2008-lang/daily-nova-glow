import { useState } from "react";
import { MoreVertical, Eye, Download, Trash2, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Note } from "@/lib/storage";
import { format } from "date-fns";
import { askNoteFormat, saveNoteFile, shareNoteFile } from "@/lib/note-export";

interface NoteItemProps {
  note: Note;
  onView: () => void;
  onDelete: () => void;
}

const NoteItem = ({ note, onView, onDelete }: NoteItemProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${note.topic}\n\n${note.content}`);
      toast({ title: "Copied!", description: "Note copied to clipboard." });
    } catch {
      toast({ title: "Error", description: "Could not copy.", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    const chosen = askNoteFormat();
    if (!chosen) return;
    try {
      const result = await shareNoteFile({ topic: note.topic, content: note.content, dateLabel: format(new Date(note.createdAt), "MMMM d, yyyy"), fileBaseName: note.topic }, chosen);
      if (result === "copied") {
        toast({ title: "Copied!", description: "Note copied to clipboard for sharing." });
      }
    } catch (err: any) {
      toast({ title: "Share failed", description: "Could not share note.", variant: "destructive" });
    }
  };

  const handleSaveToPhone = async () => {
    const chosen = askNoteFormat();
    if (!chosen) return;
    await saveNoteFile({ topic: note.topic, content: note.content, dateLabel: format(new Date(note.createdAt), "MMMM d, yyyy"), fileBaseName: note.topic }, chosen);
    toast({ title: "Saved", description: "Note saved to your device." });
  };

  const preview = note.content.length > 100 
    ? note.content.substring(0, 100) + "..." 
    : note.content;

  return (
    <>
      <Card 
        className="glass p-4 cursor-pointer hover:border-primary/50 transition-all group"
        onClick={onView}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {note.topic || "Untitled Note"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {preview}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              {format(new Date(note.createdAt), "MMM d, yyyy")}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="w-4 h-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopy(); }}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShare(); }}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSaveToPhone(); }}>
                <Download className="w-4 h-4 mr-2" />
                Save to Phone
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{note.topic || "this note"}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default NoteItem;