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
    const shareText = `${note.topic}\n\n${note.content}\n\n— Note from DailyNova`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: note.topic,
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast({ title: "Share failed", description: "Could not open share sheet.", variant: "destructive" });
        }
      }
    } else {
      toast({ title: "Not supported", description: "Share is available in native app or standalone browser.", variant: "destructive" });
    }
  };

  const handleSaveToPhone = () => {
    const content = `${note.topic}\n\nCreated: ${format(new Date(note.createdAt), "MMMM d, yyyy")}\n\n${note.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.topic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${format(new Date(note.createdAt), "yyyy-MM-dd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Note saved to your device." });
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