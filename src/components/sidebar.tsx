"use client"

import { type UserData, clearAuth, launchGame } from "@/app/tauri-bridge"
import { CrewSync } from "@/components/crew-sync"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NavUser } from "@/components/user-nav"
import { useProcess } from '@/contexts/ProcessContext';
import { useUser } from "@/contexts/UserContext"
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { AlertTriangle, AudioWaveform, Home, Monitor, Play, SlidersHorizontal, Terminal } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import pkg from "../../package.json"

type Page = import('@/components/main-app').Page

interface SidebarProps {
  currentPage: Page
  onPageChange: (page: Page) => void
  onboarding?: boolean
  basePath?: string // if provided, navigate using router to `${basePath}/...`
}

type LaunchStatus = 'disconnected' | 'connecting' | 'connected'

const GAME_LABELS: Record<string, { short: string; full: string }> = {
  ACC: { short: 'ACC', full: 'Assetto Corsa Competizione' },
  LMU: { short: 'LMU', full: 'Le Mans Ultimate' },
  iRacing: { short: 'iRacing', full: 'iRacing' },
}

export function Sidebar({ currentPage, onPageChange, onboarding, basePath }: SidebarProps) {
  const router = useRouter();
  const appVersion = (pkg as any).version as string | undefined;
  const gameVersions = ((pkg as any).relaydriveGameVersions || {}) as Record<string, string>;

  const gameKey = (() => {
    if (!basePath) return undefined;
    const key = basePath.replace(/^\//, "").toLowerCase();
    if (key === "acc") return "ACC";
    if (key === "lmu") return "LMU";
    if (key === "iracing") return "iRacing";
    return undefined;
  })();
  const gameVersion = gameKey ? gameVersions[gameKey] : undefined;
  interface Profile {
    name: string;
    profileImage: string | null;
    accountType: string;
  }

  const [profile, setProfile] = useState<Profile>({
    name: "User",
    profileImage: null,
    accountType: "free"
  })

  const { user, refresh: refreshUser } = useUser();
  const [userName, setUserName] = useState<string | null>(null);
  const prevUserNameRef = useRef<string | null>(null);

  useEffect(() => {
    if (onboarding !== false) return;
    
    const loadProfile = async () => {
      try {
        const profileData = await invoke<Profile>('get_profile')
        if (profileData) {
          setProfile(profileData as Profile)
          console.log("Sidebar: Profile updated from backend", profileData)
        }
      } catch (err) {
        // Silently fail - we don't care about this error
        // The app should be in onboarding mode if there's no profile
      }
    }

    loadProfile();
    // user is loaded by UserProvider; update local state name if present
    if (user?.name) {
      setUserName(user.name);
    }

    let unlisten: (() => void) | undefined;
    (async () => {
      if (onboarding === false) {
        try {
          unlisten = await listen('profile-updated', async () => {
            console.log("Sidebar: Received profile-updated event");
            await loadProfile();
            await refreshUser();
          });
        } catch (err) {
          console.error('Failed to set up profile update listener:', err);
        }
      }
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, [onboarding, user?.name, refreshUser]);

  // Notify when username changes (after initial load)
  useEffect(() => {
    const prev = prevUserNameRef.current;
    if (user?.name && prev && user.name !== prev) {
      toast.success("Profile updated", { description: user.name });
    }
    if (user?.name) prevUserNameRef.current = user.name;
  }, [user?.name]);

  // userName state declared above to track current display name
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const { activeGame, isRunning, isLoading, monitorGame } = useProcess();
  const [gameStatus, setGameStatus] = useState<LaunchStatus>('disconnected');
  const isSelectedGameActive = gameKey ? activeGame?.toLowerCase() === gameKey.toLowerCase() : false;
  const gameLabelInfo = gameKey ? GAME_LABELS[gameKey] : undefined;
  const gameLabel = gameLabelInfo?.full ?? (gameKey ?? "Game");
  const gameShortLabel = gameLabelInfo?.short ?? gameLabel;

  useEffect(() => {
    if (!gameKey) return;
    if (isSelectedGameActive) return;
    (async () => {
      try {
        await monitorGame(gameKey);
      } catch (err) {
        console.error('[Sidebar] Failed to monitor game:', err);
      }
    })();
  }, [gameKey, isSelectedGameActive, monitorGame]);

  useEffect(() => {
    if (!gameKey) {
      setGameStatus('disconnected');
      return;
    }
    if (isLoading) return;
    if (isSelectedGameActive && isRunning) {
      setGameStatus('connected');
      return;
    }
    setGameStatus(prev => (prev === 'connecting' ? prev : 'disconnected'));
  }, [gameKey, isLoading, isSelectedGameActive, isRunning]);

  const menuItems = [
    { id: "home" as Page, label: "Home", icon: Home },
    { id: "overlay" as Page, label: "Overlay", icon: Monitor },
    { id: "setup" as Page, label: "Setup", icon: SlidersHorizontal },
    { id: "console" as Page, label: "Console", icon: Terminal },
  ];

  const handleLaunchGame = async () => {
    if (!gameKey) return;

    if (gameStatus === 'connected') {
      setIsConfirmDialogOpen(true);
      return;
    }

    console.log(`[handleLaunchGame:${gameKey}] Starting launch sequence`);
    setGameStatus('connecting');

    // Set a timeout to handle the case where the game doesn't start
    const timeoutId = setTimeout(() => {
      console.log(`[handleLaunchGame:${gameKey}] Game launch timed out after 1 minute`);
      setGameStatus(prev => {
        if (prev === 'connecting') {
          setIsErrorModalOpen(true);
          return 'disconnected';
        }
        return prev;
      });
    }, 60000); // 1 minute timeout

    try {
      if (!isSelectedGameActive) {
        try {
          await monitorGame(gameKey);
        } catch (err) {
          console.error(`[handleLaunchGame:${gameKey}] Failed to set active game:`, err);
        }
      }
      await launchGame(gameKey);
      console.log(`[handleLaunchGame:${gameKey}] Launch command sent`);

      // The process status will be updated via the process_status event
      // which will be handled by the ProcessProvider

      // Clear the timeout if the component unmounts
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error(`[handleLaunchGame:${gameKey}] Failed to launch:`, error);
      clearTimeout(timeoutId);
      setGameStatus('disconnected');
      setIsErrorModalOpen(true);
    }
  };

  const handleKillProcess = async () => {
    try {
      // Get the current window using Tauri's window API
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const window = getCurrentWindow();
      
      // Pass the app handle to the backend
      await invoke('kill_process', { appHandle: { app: window } });
      
      // Update the UI immediately
      setGameStatus('disconnected');
    } catch (error) {
      console.error('Failed to kill process:', error);
      alert(`Failed to close ${gameLabel}. Please close it manually.`);
    } finally {
      setIsConfirmDialogOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearAuth();
      toast.success('Signed out', { description: 'Authentication token removed' });
      // Restart app flow: go back to root so startup logic can run (and prompt for sign-in if needed)
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to clear auth token:', error);
      toast.error('Failed to sign out');
    }
  }

  const handleUpgrade = () => {
    toast.info('Upgrade to Pro coming soon!');
  }

  const userDisplayName = userName ?? profile.name
  const accountLabel = (() => {
    const role = (user?.role ?? null) || (profile.accountType === 'premium' ? 'pro' : profile.accountType ?? 'free');
    switch ((role || 'free').toLowerCase()) {
      case 'admin':
        return 'Admin Account';
      case 'pro':
      case 'premium':
        return 'Pro Account';
      default:
        return 'Free Account';
    }
  })()
  const userEmail = accountLabel
  const userAvatar = (user?.imageUrl ?? profile.profileImage) || undefined

  const getButtonClass = () => {
    switch (gameStatus) {
      case "connected":
        return "bg-green-600 hover:bg-green-700 text-white"
      case "connecting":
        return "bg-yellow-600 hover:bg-yellow-700 text-white animate-pulse"
      default:
        return "bg-red-accent hover:bg-red-accent/90 text-white"
    }
  }

  const buttonLabel = (() => {
    if (gameStatus === 'connecting') return 'Connecting...';
    if (!gameKey) return 'Launch Game';
    if (gameStatus === 'connected') return `${gameShortLabel} Running`;
    return `Launch ${gameShortLabel}`;
  })();

  const navigate = (page: Page) => {
    if (basePath) {
      switch (page) {
        case "home":
          router.push(basePath);
          break;
        case "overlay":
          router.push(`${basePath}/overlay`);
          break;
        case "console":
          router.push(`${basePath}/console`);
          break;
        case "profile":
          router.push(basePath ? `${basePath}/profile` : "/profile");
          break;
        case "settings":
          router.push(basePath ? `${basePath}/settings` : "/settings");
          break;
        case "setup":
          router.push(basePath ? `${basePath}/setup` : "/setup");
          break;
        default:
          router.push(basePath);
      }
    } else {
      onPageChange(page);
    }
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="text-2xl font-bold">
          <span className="text-white">RelayDrive</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {`v${appVersion ?? "0.0.0"}`}
          {gameKey ? ` - ${gameKey} v${gameVersion ?? "dev"}` : ""}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={currentPage === item.id ? "secondary" : "ghost"}
            className={`w-full justify-start rounded-app ${
              currentPage === item.id ? "bg-red-accent/10 text-red-accent hover:bg-red-accent/20" : ""
            }`}
            onClick={() => navigate(item.id)}
          >
            <item.icon className="w-4 h-4 mr-3" />
            {item.label}
          </Button>
        ))}
      </nav>

      {/* CrewSync Section */}
      <CrewSync />

      {/* Launch ACC Button */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={handleLaunchGame}
          disabled={!gameKey || gameStatus === "connecting"}
          className={`w-full rounded-app h-12 font-medium transition-all ${getButtonClass()}`}
        >
          <Play className="w-5 h-5 mr-2" />
          {buttonLabel}
        </Button>

        {/* Confirmation Dialog */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Close {gameLabel}?
              </DialogTitle>
              <DialogDescription className="pt-2">
                Are you sure you want to close {gameLabel}? Any unsaved progress may be lost.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setIsConfirmDialogOpen(false)}
                className="rounded-app"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleKillProcess}
                className="rounded-app bg-red-600 hover:bg-red-700"
              >
                Close Game
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Error Dialog */}
        <Dialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Game Not Found
              </DialogTitle>
              <DialogDescription className="pt-2">
                Could not find {gameLabel}. Please make sure the game is installed and Steam is running.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                onClick={() => setIsErrorModalOpen(false)}
                className="rounded-app w-full"
              >
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="p-4 border-t border-border">
        <NavUser
          user={{
            name: userDisplayName,
            email: userEmail,
            avatar: userAvatar ?? '',
          }}
          onUpgrade={handleUpgrade}
          onProfile={() => navigate("profile" as Page)}
          onSettings={() => navigate("settings" as Page)}
          onLogout={handleLogout}
        />
      </div>
    </div>
  )
}
