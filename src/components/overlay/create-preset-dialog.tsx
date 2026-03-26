"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface CreatePresetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetName: string
  onPresetNameChange: (name: string) => void
  onSave: () => Promise<void>
}

export function CreatePresetDialog({
  open,
  onOpenChange,
  presetName,
  onPresetNameChange,
  onSave,
}: CreatePresetDialogProps) {
  const handleSave = async () => {
    await onSave()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save new preset</DialogTitle>
          <DialogDescription>Enter a name to save the current overlay layout.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={presetName}
            onChange={(event) => onPresetNameChange(event.target.value)}
            placeholder="Preset name"
            className="h-10 rounded-[var(--radius-lg)]"
          />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-[var(--radius-lg)]">
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
  )
}

