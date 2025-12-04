import { useState } from "react";
import { MoreVertical, Trash2, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Note } from "@/lib/storage";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface NoteItemProps {
  note: Note;
  onDelete: (id: string) => void;
  onView: (note: Note) => void;
}

export const NoteItem = ({ note, onDelete, onView }: NoteItemProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const saveToFile = () => {
    const content = `Note - ${format(new Date(note.createdAt), "MMMM d, yyyy")}\n\n${note.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note-${format(new Date(note.createdAt), "yyyy-MM-dd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Note saved to your device." });
  };

  const preview = note.content.substring(0, 80) + (note.content.length > 80 ? "..." : "");

  return (
    <>
      <div 
        className="flex items-center justify-between p-3 bg-background/30 rounded-lg hover:bg-background/50 transition-colors cursor-pointer group"
        onClick={() => onView(note)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{preview}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(note.createdAt), "MMM d, yyyy")}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(note); }}>
              <Eye className="w-4 h-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); saveToFile(); }}>
              <Download className="w-4 h-4 mr-2" />
              Save to Phone
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(note.id)} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
