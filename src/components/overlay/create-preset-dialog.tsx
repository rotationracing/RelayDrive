"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CreatePresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetName: string;
  onPresetNameChange: (name: string) => void;
  onSave: () => Promise<void>;
}

export function CreatePresetDialog({
  open,
  onOpenChange,
  presetName,
  onPresetNameChange,
  onSave,
}: CreatePresetDialogProps) {
  const handleSave = async () => {
    await onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 rounded-[var(--radius-2xl)] border-border bg-card p-0 shadow-2xl">
        <DialogHeader>
          <div className="border-b border-border px-6 py-5">
            <DialogTitle>Save new preset</DialogTitle>
            <DialogDescription className="mt-2">
              Enter a name to save the current overlay layout.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="px-6 py-4">
          <Input
            value={presetName}
            onChange={(event) => onPresetNameChange(event.target.value)}
            placeholder="Preset name"
            className="h-11 rounded-[var(--radius-lg)] border-border bg-input"
          />
        </div>
        <DialogFooter className="px-6 pb-5 pt-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-[var(--radius-lg)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-[var(--radius-lg)]"
            disabled={!presetName.trim()}
          >
            Save Preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
