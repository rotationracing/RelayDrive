"use client";

import type { CarInfo, SetupEntry, TrackInfo, SetupImportData, LookupShareResponse } from "@/app/tauri-bridge";
import {
  completeSetupImport,
  deleteSetupFile,
  getAccCars,
  getAccTracks,
  listAccSetups,
  openSetupFileDialog,
  prepareSetupImport,
  readSetupFile,
  renameSetupFile,
  shareSetup,
  lookupSetup,
  getAuth,
} from "@/app/tauri-bridge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Edit2,
  FileJson,
  FileUp,
  Folder,
  FolderOpen,
  FolderPlus,
  Fuel,
  Hash,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Shield,
  Copy,
  CheckCircle2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface CarSetups {
  car: CarInfo;
  tracks: Map<string, SetupEntry[]>;
}

interface ParsedSetup {
  carName?: string;
  basicSetup?: {
    tyres?: Record<string, unknown>;
    alignment?: Record<string, unknown>;
    electronics?: {
      tC1?: number;
      tC2?: number;
      abs?: number;
      eCUMap?: number;
      fuelMix?: number;
      telemetryLaps?: number;
    };
    strategy?: {
      fuel?: number;
      nPitStops?: number;
      tyreSet?: number;
      frontBrakePadCompound?: number;
      rearBrakePadCompound?: number;
      pitStrategy?: unknown[];
      fuelPerLap?: number;
    };
  };
  advancedSetup?: Record<string, unknown>;
  trackBopType?: number;
}

const normalizeId = (value: string) => value.trim().toLowerCase();
const stripJsonExtension = (value: string) => value.replace(/\.json$/i, "");
const getFileNameFromPath = (value: string) => value.split(/[\\/]/).pop() ?? value;

function SetupPage() {
  const [cars, setCars] = useState<CarInfo[]>([]);
  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [setups, setSetups] = useState<SetupEntry[]>([]);
  const [expandedCars, setExpandedCars] = useState<Set<string>>(new Set());
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  const [selectedSetup, setSelectedSetup] = useState<SetupEntry | null>(null);
  const [setupContent, setSetupContent] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareExpires, setShareExpires] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<"source" | "destination">("source");
  const [importMode, setImportMode] = useState<"file" | "code">("file");
  const [importData, setImportData] = useState<SetupImportData | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [importSetupName, setImportSetupName] = useState("");
  const [importCode, setImportCode] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [trackSearch, setTrackSearch] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [carsData, tracksData, setupsData] = await Promise.all([
        getAccCars(),
        getAccTracks(),
        listAccSetups(),
      ]);
      setCars(carsData);
      setTracks(tracksData);
      setSetups(setupsData);
    } catch (e) {
      console.error("Failed to load setups:", e);
      toast.error("Failed to load setups");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const carSetupTree = useMemo(() => {
    const carMap = new Map<string, CarInfo>();
    for (const car of cars) {
      carMap.set(car.id, car);
    }

    const tree = new Map<string, CarSetups>();

    for (const setup of setups) {
      if (!tree.has(setup.carId)) {
        const car = carMap.get(setup.carId);
        tree.set(setup.carId, {
          car: car ?? {
            id: setup.carId,
            prettyName: setup.carId,
            fullName: setup.carId,
            brandName: "",
          },
          tracks: new Map(),
        });
      }

      const carEntry = tree.get(setup.carId);
      if (!carEntry) {
        continue;
      }
      if (!carEntry.tracks.has(setup.trackId)) {
        carEntry.tracks.set(setup.trackId, []);
      }
      const trackSetups = carEntry.tracks.get(setup.trackId);
      if (!trackSetups) {
        continue;
      }
      trackSetups.push(setup);
    }

    return Array.from(tree.values()).sort((a, b) => a.car.fullName.localeCompare(b.car.fullName));
  }, [cars, setups]);

  const trackMap = useMemo(() => {
    const map = new Map<string, TrackInfo>();
    for (const track of tracks) {
      map.set(normalizeId(track.id), track);
    }
    return map;
  }, [tracks]);

  const getTrackLabel = useCallback(
    (trackId: string) => trackMap.get(normalizeId(trackId))?.prettyName ?? trackId,
    [trackMap],
  );

  const sortedTracks = useMemo(
    () => [...tracks].sort((a, b) => a.prettyName.localeCompare(b.prettyName)),
    [tracks],
  );

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return carSetupTree;
    const q = searchQuery.toLowerCase();
    return carSetupTree.filter(
      (cs) =>
        cs.car.fullName.toLowerCase().includes(q) ||
        cs.car.prettyName.toLowerCase().includes(q) ||
        cs.car.brandName.toLowerCase().includes(q),
    );
  }, [carSetupTree, searchQuery]);

  const toggleCar = useCallback((carId: string) => {
    setExpandedCars((prev) => {
      const next = new Set(prev);
      if (next.has(carId)) next.delete(carId);
      else next.add(carId);
      return next;
    });
  }, []);

  const toggleTrack = useCallback((key: string) => {
    setExpandedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectSetup = useCallback(async (setup: SetupEntry) => {
    setSelectedSetup(setup);
    try {
      const content = await readSetupFile(setup.fullPath);
      setSetupContent(content);
    } catch (e) {
      console.error("Failed to read setup file:", e);
      toast.error("Failed to read setup file");
      setSetupContent("");
    }
  }, []);

  const handleRename = useCallback(async () => {
    if (!selectedSetup || !newName.trim()) return;
    try {
      const cleanName = newName.replace(/\.json$/i, "");
      const updatedPath = await renameSetupFile(selectedSetup.fullPath, cleanName);
      const newFilename = `${cleanName}.json`;
      toast.success("Setup renamed successfully");
      setSelectedSetup({ ...selectedSetup, filename: newFilename, fullPath: updatedPath });
      setIsRenameOpen(false);
      await loadData();
    } catch (e) {
      console.error("Failed to rename setup:", e);
      toast.error("Failed to rename setup");
    }
  }, [selectedSetup, newName, loadData]);

  const handleDelete = useCallback(async () => {
    if (!selectedSetup) return;
    try {
      await deleteSetupFile(selectedSetup.fullPath);
      toast.success("Setup deleted");
      setSelectedSetup(null);
      setSetupContent("");
      setIsDeleteOpen(false);
      await loadData();
    } catch (e) {
      console.error("Failed to delete setup:", e);
      toast.error("Failed to delete setup");
    }
  }, [selectedSetup, loadData]);

  const parsedSetup = useMemo<ParsedSetup | null>(() => {
    if (!setupContent) return null;
    try {
      return JSON.parse(setupContent) as ParsedSetup;
    } catch {
      return null;
    }
  }, [setupContent]);

  const carInfo = useMemo(() => {
    if (!selectedSetup) return null;
    return cars.find((c) => c.id === selectedSetup.carId) ?? null;
  }, [selectedSetup, cars]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const resetImportFlow = useCallback(() => {
    setImportStep("source");
    setImportMode("file");
    setImportData(null);
    setSelectedTrack(null);
    setImportSetupName("");
    setImportCode("");
    setIsImporting(false);
    setTrackSearch("");
  }, []);

  const handleImportDialogChange = useCallback(
    (open: boolean) => {
      setIsImportOpen(open);
      if (!open) {
        resetImportFlow();
      }
    },
    [resetImportFlow],
  );

  const loadImportData = useCallback(async (fileName: string, fileContent: string) => {
    const data = await prepareSetupImport(fileName, fileContent);
    setImportData(data);
    setImportSetupName(stripJsonExtension(data.fileName));
    setSelectedTrack(null);
    setImportStep("destination");
  }, []);

  const handleImportClick = useCallback(async () => {
    try {
      const filePath = await openSetupFileDialog();
      if (!filePath) return;

      const fileContent = await readSetupFile(filePath);
      await loadImportData(getFileNameFromPath(filePath), fileContent);
    } catch (e) {
      console.error("Failed to import setup:", e);
      toast.error("Failed to import setup");
    }
  }, [loadImportData]);

  const handleCompleteImport = useCallback(async () => {
    if (!importData || !selectedTrack || !importSetupName.trim()) return;

    setIsImporting(true);
    try {
      await completeSetupImport(
        importData.carId,
        selectedTrack,
        importSetupName,
        importData.fileContent,
      );
      toast.success("Setup imported successfully");
      handleImportDialogChange(false);
      await loadData();
    } catch (e) {
      console.error("Failed to complete import:", e);
      toast.error("Failed to import setup");
    } finally {
      setIsImporting(false);
    }
  }, [handleImportDialogChange, importData, importSetupName, loadData, selectedTrack]);

  const handleShareSetup = useCallback(async () => {
    if (!selectedSetup) return;

    setIsSharing(true);
    try {
      const auth = await getAuth();
      if (!auth) {
        toast.error("Not authenticated");
        return;
      }

      const response = await shareSetup(
        auth.token,
        selectedSetup.filename,
        setupContent,
      );
      setShareCode(response.code);
      setShareExpires(response.expiresAt);
      setIsShareOpen(true);
    } catch (e) {
      console.error("Failed to share setup:", e);
      toast.error(`Failed to share setup: ${e}`);
    } finally {
      setIsSharing(false);
    }
  }, [selectedSetup, setupContent]);

  const handleImportCode = useCallback(async () => {
    if (importCode.length !== 4) {
      toast.error("Please enter a valid 4-digit code");
      return;
    }

    try {
      const auth = await getAuth();
      if (!auth) {
        toast.error("Not authenticated");
        return;
      }

      const result = await lookupSetup(auth.token, importCode);
      await loadImportData(result.fileName, result.setupJson);
    } catch (e) {
      console.error("Failed to lookup setup:", e);
      toast.error(`Failed to import: ${e}`);
    }
  }, [importCode, loadImportData]);

  const handleEditCard = (cardId: string, currentValue: string) => {
    setEditingCard(cardId);
    // Extract just the number from the display value (e.g., "10L" -> "10")
    const numValue = currentValue.replace(/[^\d.-]/g, "");
    setEditValue(numValue);
  };

  const saveCardEdit = useCallback(
    (cardId: string) => {
      if (!setupContent || !editValue) {
        setEditingCard(null);
        return;
      }

      try {
        const updated = JSON.parse(setupContent);
        const numVal = parseFloat(editValue);

        if (isNaN(numVal)) {
          setEditingCard(null);
          return;
        }

        if (cardId === "fuel") {
          if (updated.basicSetup?.strategy) {
            updated.basicSetup.strategy.fuel = numVal;
          }
        } else if (cardId === "abs") {
          if (updated.basicSetup?.electronics) {
            updated.basicSetup.electronics.abs = numVal;
          }
        } else if (cardId === "tc1") {
          if (updated.basicSetup?.electronics) {
            updated.basicSetup.electronics.tC1 = numVal;
          }
        } else if (cardId === "tc2") {
          if (updated.basicSetup?.electronics) {
            updated.basicSetup.electronics.tC2 = numVal;
          }
        }

        setSetupContent(JSON.stringify(updated));
        setEditingCard(null);
      } catch (e) {
        console.error("Failed to save card edit:", e);
        setEditingCard(null);
      }
    },
    [setupContent],
  );



  const selectedImportTrack = selectedTrack
    ? (trackMap.get(normalizeId(selectedTrack)) ?? null)
    : null;
  const importCarLabel = importData?.carInfo?.fullName ?? importData?.carName ?? "Unknown car";

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="px-3 pt-9 pb-3 border-b border-border">
          <div className="flex items-center gap-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full pl-8 text-xs bg-input border-border focus-visible:border-border focus-visible:ring-border/30"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={refresh}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleImportDialogChange(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Setup</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Tree */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading setups…
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              <SlidersHorizontal className="w-8 h-8 mb-2 opacity-40" />
              <span>No setups found</span>
            </div>
          ) : (
            <div className="py-1">
              {filteredTree.map((carSetups) => {
                const isCarExpanded = expandedCars.has(carSetups.car.id);
                return (
                  <div key={carSetups.car.id}>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-accent/50 transition-colors"
                      onClick={() => toggleCar(carSetups.car.id)}
                    >
                      <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isCarExpanded ? "rotate-90" : ""}`} />
                      <span className="truncate">
                        <span className="text-muted-foreground">{carSetups.car.brandName}</span>{" "}
                        {carSetups.car.prettyName}
                      </span>
                    </button>

                    <div
                      className="grid transition-[grid-template-rows] duration-200 ease-out"
                      style={{ gridTemplateRows: isCarExpanded ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                      {Array.from(carSetups.tracks.entries())
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([trackId, trackSetups]) => {
                          const trackKey = `${carSetups.car.id}::${trackId}`;
                          const isTrackExpanded = expandedTracks.has(trackKey);
                          return (
                            <div key={trackKey}>
                              <button
                                type="button"
                                className="flex items-center gap-1.5 w-full pl-7 pr-3 py-1.5 text-left text-xs hover:bg-accent/50 transition-colors"
                                onClick={() => toggleTrack(trackKey)}
                              >
                                {isTrackExpanded ? (
                                  <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                  <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                                <span className="truncate text-muted-foreground">
                                  {getTrackLabel(trackId)}
                                </span>
                              </button>

                              <div
                                className="grid transition-[grid-template-rows] duration-200 ease-out"
                                style={{ gridTemplateRows: isTrackExpanded ? "1fr" : "0fr" }}
                              >
                                <div className="overflow-hidden">
                                {trackSetups
                                  .sort((a, b) => a.filename.localeCompare(b.filename))
                                  .map((setup) => {
                                    const isSelected = selectedSetup?.fullPath === setup.fullPath;
                                    return (
                                      <button
                                        type="button"
                                        key={setup.fullPath}
                                        className={`flex items-center gap-1.5 w-full pl-12 pr-3 py-1.5 text-left text-xs transition-colors ${isSelected
                                            ? "bg-red-accent/10 text-red-accent"
                                            : "hover:bg-accent/50 text-foreground"
                                          }`}
                                        onClick={() => selectSetup(setup)}
                                      >
                                        <FileJson
                                          className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-red-accent" : "text-muted-foreground"
                                            }`}
                                        />
                                        <span className="truncate">{setup.filename}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedSetup ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-5 pt-10 space-y-4">
              {/* Setup hero card */}
              <div className="rounded-[var(--radius-2xl)] border border-border bg-card overflow-hidden">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0 space-y-1">
                    <div className="text-lg font-bold truncate">
                      {selectedSetup.filename.replace(/\.json$/i, "")}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {carInfo && (
                        <span className="bg-secondary px-2 py-0.5 rounded-md font-medium text-foreground">
                          {carInfo.fullName}
                        </span>
                      )}
                      <span>{getTrackLabel(selectedSetup.trackId)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setNewName(selectedSetup.filename.replace(/\.json$/, ""));
                            setIsRenameOpen(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Rename</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setIsDeleteOpen(true)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Delete</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={handleShareSetup}
                          disabled={isSharing}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Share</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Quick-glance values */}
                {parsedSetup && (
                  <div className="grid grid-cols-4 border-t border-border">
                    <QuickCard
                      id="fuel"
                      icon={<Fuel className="w-4 h-4" />}
                      label="Fuel"
                      value={
                        parsedSetup.basicSetup?.strategy?.fuel != null
                          ? `${parsedSetup.basicSetup.strategy.fuel}L`
                          : "—"
                      }
                      isEditing={editingCard === "fuel"}
                      editValue={editValue}
                      onEditChange={setEditValue}
                      onEdit={() =>
                        handleEditCard(
                          "fuel",
                          parsedSetup.basicSetup?.strategy?.fuel != null
                            ? `${parsedSetup.basicSetup.strategy.fuel}L`
                            : "—",
                        )
                      }
                      onSave={() => saveCardEdit("fuel")}
                      onCancel={() => setEditingCard(null)}
                    />
                    <QuickCard
                      id="abs"
                      icon={<Shield className="w-4 h-4" />}
                      label="ABS"
                      value={parsedSetup.basicSetup?.electronics?.abs?.toString() ?? "—"}
                      isEditing={editingCard === "abs"}
                      editValue={editValue}
                      onEditChange={setEditValue}
                      onEdit={() =>
                        handleEditCard(
                          "abs",
                          parsedSetup.basicSetup?.electronics?.abs?.toString() ?? "—",
                        )
                      }
                      onSave={() => saveCardEdit("abs")}
                      onCancel={() => setEditingCard(null)}
                      border
                    />
                    <QuickCard
                      id="tc1"
                      label="TC1"
                      value={parsedSetup.basicSetup?.electronics?.tC1?.toString() ?? "—"}
                      isEditing={editingCard === "tc1"}
                      editValue={editValue}
                      onEditChange={setEditValue}
                      onEdit={() =>
                        handleEditCard(
                          "tc1",
                          parsedSetup.basicSetup?.electronics?.tC1?.toString() ?? "—",
                        )
                      }
                      onSave={() => saveCardEdit("tc1")}
                      onCancel={() => setEditingCard(null)}
                      border
                    />
                    <QuickCard
                      id="tc2"
                      label="TC2"
                      value={parsedSetup.basicSetup?.electronics?.tC2?.toString() ?? "—"}
                      isEditing={editingCard === "tc2"}
                      editValue={editValue}
                      onEditChange={setEditValue}
                      onEdit={() =>
                        handleEditCard(
                          "tc2",
                          parsedSetup.basicSetup?.electronics?.tC2?.toString() ?? "—",
                        )
                      }
                      onSave={() => saveCardEdit("tc2")}
                      onCancel={() => setEditingCard(null)}
                      border
                    />
                  </div>
                )}
              </div>

              {/* JSON tree viewer */}
              <div className="rounded-[var(--radius-2xl)] border border-border bg-card p-4">
                {parsedSetup ? (
                  <JsonTree data={parsedSetup} />
                ) : (
                  <pre className="text-xs leading-relaxed font-mono text-foreground whitespace-pre-wrap break-all select-text">
                    <code>{setupContent}</code>
                  </pre>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <SlidersHorizontal className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Select a setup to view</p>
          </div>
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-md rounded-[var(--radius-2xl)] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Rename Setup</DialogTitle>
            <DialogDescription>Enter a new name for this setup file.</DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Setup name"
            className="h-10 bg-input border-border"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-[var(--radius-2xl)] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Delete Setup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedSetup?.filename}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={isImportOpen} onOpenChange={handleImportDialogChange}>
        <DialogContent className="max-h-[min(90vh,560px)] w-[min(95vw,680px)] sm:max-w-none rounded-[var(--radius-2xl)] border-border bg-card p-0 overflow-hidden flex flex-col shadow-2xl">
          {importStep === "source" ? (
            <div className="flex flex-col h-full">
              <div className="px-6 py-5 border-b border-border">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Import Setup</DialogTitle>
                </DialogHeader>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Left: File Selection */}
                <div className="p-8 flex flex-col items-center justify-center border-r border-border bg-accent/5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-accent/10 text-red-accent ring-1 ring-red-accent/20">
                    <FileUp className="h-6 w-6" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    From File
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-6 font-semibold border-border hover:border-red-accent hover:bg-red-accent/5 transition-colors rounded-app"
                    onClick={handleImportClick}
                  >
                    Select JSON File
                  </Button>
                </div>

                {/* Right: Code Input */}
                <div className="p-8 flex flex-col items-center justify-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
                    <Hash className="h-6 w-6" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    By Code
                  </h3>
                  <div className="w-full max-w-[160px] space-y-3">
                    <Input
                      inputMode="numeric"
                      maxLength={4}
                      value={importCode}
                      onChange={(e) => setImportCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="0000"
                      className="h-10 bg-input border-border text-center text-lg font-bold tracking-[0.3em] focus-visible:ring-red-accent/20 rounded-app"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 disabled:opacity-20"
                      disabled={importCode.length !== 4}
                      onClick={handleImportCode}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleImportDialogChange(false)}
                  className="font-medium text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-red-accent">
                    Importing to
                  </div>
                  <div className="text-lg font-bold">
                    {importData?.carInfo?.prettyName ?? "Unknown Car"}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 space-y-4 bg-muted/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Setup Name
                    </label>
                    <Input
                      id="import-setup-name"
                      value={importSetupName}
                      onChange={(e) => setImportSetupName(e.target.value)}
                      placeholder="e.g. Qualy_Dry"
                      className="h-9 text-xs bg-card border-border focus-visible:ring-red-accent/20 rounded-app"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Search Tracks
                    </label>
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground transition-colors group-focus-within:text-red-accent" />
                      <Input
                        placeholder="Filter..."
                        value={trackSearch}
                        onChange={(e) => setTrackSearch(e.target.value)}
                        className="h-9 pl-9 text-xs bg-card border-border focus-visible:ring-red-accent/20 rounded-app"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 px-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 py-2">
                  {sortedTracks
                    .filter(
                      (t) =>
                        t.prettyName.toLowerCase().includes(trackSearch.toLowerCase()) ||
                        t.id.toLowerCase().includes(trackSearch.toLowerCase()),
                    )
                    .map((track) => {
                      const isSelected = selectedTrack === track.id;
                      return (
                        <button
                          type="button"
                          key={track.id}
                          onClick={() => setSelectedTrack(track.id)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${isSelected
                              ? "bg-red-accent/10 text-red-accent ring-1 ring-inset ring-red-accent/20"
                              : "hover:bg-accent text-foreground/80 hover:text-foreground"
                            }`}
                        >
                          <div
                            className={`p-1.5 rounded-md ${isSelected ? "bg-red-accent/20" : "bg-muted text-muted-foreground"
                              }`}
                          >
                            <MapPinned className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-semibold truncate leading-tight">
                              {track.prettyName}
                            </div>
                            <div className="text-[9px] font-medium tracking-tight opacity-50 truncate">
                              {track.id}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border bg-card flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setImportStep("source")}
                  className="font-semibold text-muted-foreground"
                >
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      Files will be saved to
                    </div>
                    <div className="text-[10px] font-medium text-foreground">
                      {selectedTrack || "..."}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-red-accent hover:bg-red-accent/90 text-white font-bold h-9 px-6 rounded-app shadow-sm transition-all active:scale-95"
                    onClick={handleCompleteImport}
                    disabled={!selectedTrack || !importSetupName.trim() || isImporting}
                  >
                    {isImporting ? "Importing…" : "Complete Import"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="sm:max-w-md rounded-[var(--radius-2xl)] border-border bg-card" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Setup Shared</DialogTitle>
            <DialogDescription>
              {shareCode ? "Your setup has been shared. Share this code with others:" : "Generating share code..."}
            </DialogDescription>
          </DialogHeader>
          {shareCode && (
            <div className="space-y-4">
              <div className="bg-secondary rounded-lg p-4 text-center">
                <div className="text-3xl font-mono font-bold text-foreground tracking-wider">
                  {shareCode}
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  className={`w-full transition-all duration-300 ${isCodeCopied ? "bg-green-600 hover:bg-green-600 text-white" : ""}`}
                  onClick={() => {
                    navigator.clipboard.writeText(shareCode);
                    setIsCodeCopied(true);
                    setTimeout(() => setIsCodeCopied(false), 2000);
                  }}
                >
                  {isCodeCopied ? (
                    <><CheckCircle2 className="size-4 mr-2" /> Copied!</>
                  ) : (
                    <><Copy className="size-4 mr-2" /> Copy Code</>
                  )}
                </Button>
              </div>
              {shareExpires && (
                <div className="text-xs text-muted-foreground text-center">
                  Expires: {new Date(shareExpires).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickCard({
  id,
  icon,
  label,
  value,
  border,
  isEditing,
  editValue,
  onEditChange,
  onEdit,
  onSave,
  onCancel,
}: {
  id: string;
  icon?: React.ReactNode;
  label: string;
  value: string;
  border?: boolean;
  isEditing: boolean;
  editValue: string;
  onEditChange: (val: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleBlur = () => {
    onSave();
  };

  return (
    <button
      onClick={!isEditing && value !== "—" ? onEdit : undefined}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left group ${border ? "border-l border-border" : ""
        } ${isEditing
          ? "bg-secondary/30"
          : value !== "—"
            ? "hover:bg-secondary/10"
            : ""
        } ${!isEditing && value !== "—" ? "cursor-pointer" : ""}`}
    >
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-lg font-bold tabular-nums leading-tight bg-transparent border-b border-primary outline-none w-full"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="text-lg font-bold tabular-nums leading-tight">{value}</div>
        )}
      </div>
      {!isEditing && value !== "—" && (
        <div className="shrink-0 p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <Edit2 className="w-3.5 h-3.5" />
        </div>
      )}
    </button>
  );
}

/* ── Collapsible JSON tree ─────────────────────────────────── */

function JsonTree({ data }: { data: unknown }) {
  return (
    <div className="font-mono text-[11px] leading-[1.6] select-text">
      <JsonNode value={data} depth={0} defaultOpen />
    </div>
  );
}

function JsonNode({
  label,
  value,
  depth,
  defaultOpen = false,
}: {
  label?: string;
  value: unknown;
  depth: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (value === null) {
    return (
      <div style={{ paddingLeft: depth * 16 }} className="flex items-baseline gap-1.5 py-px">
        {label && <span className="text-red-400">{label}:</span>}
        <span className="text-muted-foreground italic">null</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    const count = value.length;
    return (
      <div>
        <button
          type="button"
          style={{ paddingLeft: depth * 16 }}
          className="flex items-center gap-1 py-px hover:bg-accent/30 w-full text-left transition-colors rounded-sm"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
          {label && <span className="text-red-400">{label}</span>}
          <span className="text-muted-foreground ml-1">[{count} items]</span>
        </button>
        {open &&
          value.map((item, i) => (
            <JsonNode key={i} label={`${i}`} value={item} depth={depth + 1} />
          ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const count = entries.length;
    return (
      <div>
        <button
          type="button"
          style={{ paddingLeft: depth * 16 }}
          className="flex items-center gap-1 py-px hover:bg-accent/30 w-full text-left transition-colors rounded-sm"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
          {label && <span className="text-red-400">{label}</span>}
          <span className="text-muted-foreground ml-1">{`{${count}}`}</span>
        </button>
        {open &&
          entries.map(([k, v]) => <JsonNode key={k} label={k} value={v} depth={depth + 1} />)}
      </div>
    );
  }

  // Primitive values
  const colorClass =
    typeof value === "number"
      ? "text-sky-400"
      : typeof value === "boolean"
        ? "text-amber-400"
        : "text-green-400";

  return (
    <div style={{ paddingLeft: depth * 16 }} className="flex items-baseline gap-1.5 py-px">
      {label && <span className="text-red-400">{label}:</span>}
      <span className={colorClass}>{typeof value === "string" ? `"${value}"` : String(value)}</span>
    </div>
  );
}

export default function AccSetupRoute() {
  return <SetupPage />;
}
