"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Crown, MoreHorizontal, Settings, UserCheck, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface CrewMember {
  id: string;
  name: string;
  role: "driver" | "crew";
  status: "online" | "offline" | "away";
}

interface CrewSession {
  id: string;
  members: CrewMember[];
  createdBy: string;
}

// Sample names for testing
const sampleNames = [
  "Alex Rodriguez",
  "Sarah Chen",
  "Mike Johnson",
  "Emma Wilson",
  "David Kim",
  "Lisa Zhang",
  "Tom Anderson",
  "Maya Patel",
  "Chris Brown",
  "Anna Garcia",
  "Ryan Lee",
  "Sophie Martin",
];

export function CrewSync() {
  const [crewSession, setCrewSession] = useState<CrewSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string }>({ name: "User" });

  // Load current user on client only
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("relaydrive-profile");
        if (saved) setCurrentUser(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-vibrant-green";
      case "away":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const createCrewSession = () => {
    const newSession: CrewSession = {
      id: `crew-${Date.now()}`,
      members: [
        {
          id: "current-user",
          name: currentUser.name,
          role: "driver",
          status: "online",
        },
      ],
      createdBy: "current-user",
    };
    setCrewSession(newSession);
  };

  const addRandomMember = () => {
    if (!crewSession || crewSession.members.length >= 4) return;

    const availableNames = sampleNames.filter(
      (name) => !crewSession.members.some((member) => member.name === name),
    );

    if (availableNames.length === 0) return;

    const randomName = availableNames[Math.floor(Math.random() * availableNames.length)];
    const newMember: CrewMember = {
      id: `member-${Date.now()}`,
      name: randomName,
      role: "crew",
      status: Math.random() > 0.3 ? "online" : Math.random() > 0.5 ? "away" : "offline",
    };

    setCrewSession({
      ...crewSession,
      members: [...crewSession.members, newMember],
    });
  };

  const makeDriver = (memberId: string) => {
    if (!crewSession) return;

    setCrewSession({
      ...crewSession,
      members: crewSession.members.map((member) => ({
        ...member,
        role: member.id === memberId ? "driver" : member.role === "driver" ? "crew" : member.role,
      })),
    });
  };

  const removeMember = (memberId: string) => {
    if (!crewSession || memberId === "current-user") return;

    setCrewSession({
      ...crewSession,
      members: crewSession.members.filter((member) => member.id !== memberId),
    });
  };

  const leaveSession = () => {
    setCrewSession(null);
    setIsModalOpen(false);
  };

  if (!crewSession) {
    return (
      <TooltipProvider>
        <div className="p-4 border-t border-border">
          <div className="text-center py-4">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">No active session</p>
            <Button onClick={createCrewSession} variant="outline" className="rounded-app">
              <UserPlus className="w-4 h-4 mr-2" />
              Create Session
            </Button>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  const onlineMembers = crewSession.members.filter((m) => m.status === "online");
  const totalMembers = crewSession.members.length;
  const canAddMembers = crewSession.members.length < 4;

  return (
    <TooltipProvider>
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">CrewSync</span>
            <Badge variant="outline" className="rounded-app-sm text-xs">
              {onlineMembers.length}/{totalMembers}
            </Badge>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-app-sm p-1 h-6 w-6">
                <Settings className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-app max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Crew Session
                </DialogTitle>
                <DialogDescription>Manage your crew session and members (max 4)</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Members ({crewSession.members.length}/4)</h4>
                  {crewSession.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-app"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-red-accent text-white">
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(member.status)}`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{member.name}</span>
                            {member.role === "driver" && (
                              <Crown className="w-3 h-3 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {member.role}
                          </div>
                        </div>
                      </div>

                      {member.id !== "current-user" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-app-sm p-1 h-6 w-6"
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-app">
                            <DropdownMenuItem
                              onClick={() => makeDriver(member.id)}
                              className="rounded-app-sm cursor-pointer"
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Make Driver
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => removeMember(member.id)}
                              className="rounded-app-sm cursor-pointer text-red-accent"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={addRandomMember}
                    variant="outline"
                    className="flex-1 rounded-app"
                    disabled={!canAddMembers}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite {!canAddMembers && "(Full)"}
                  </Button>
                  <Button
                    onClick={leaveSession}
                    variant="destructive"
                    className="flex-1 rounded-app"
                  >
                    Leave Session
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Crew Member Avatars */}
        <div className="flex items-center space-x-1">
          {crewSession.members.slice(0, 4).map((member, index) => (
            <Tooltip key={member.id}>
              <TooltipTrigger asChild>
                <div
                  className="relative group cursor-pointer transition-all duration-200 hover:scale-110 hover:z-10"
                  style={{
                    marginLeft: index > 0 ? "-8px" : "0",
                    zIndex: crewSession.members.length - index,
                  }}
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8 border-2 border-background transition-all duration-200 group-hover:border-red-accent group-hover:shadow-lg">
                      <AvatarFallback className="text-xs bg-red-accent text-white group-hover:bg-red-accent-hover">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Status indicator */}
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background transition-all duration-200 ${getStatusColor(member.status)} group-hover:scale-110`}
                    />

                    {/* Driver indicator */}
                    {member.role === "driver" && (
                      <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110">
                        <Crown className="w-2 h-2 text-black" />
                      </div>
                    )}
                  </div>

                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-full bg-red-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 animate-pulse" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="rounded-app-sm">
                <div className="text-center">
                  <div className="font-medium">{member.name}</div>
                  <div className="text-xs text-muted-foreground capitalize flex items-center justify-center space-x-1">
                    {member.role === "driver" && <Crown className="w-3 h-3" />}
                    <span>{member.role}</span>
                  </div>
                  <div className="text-xs mt-1">
                    <Badge
                      variant={member.status === "online" ? "default" : "secondary"}
                      className="rounded-app-sm text-xs"
                    >
                      {member.status}
                    </Badge>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Add member button - only show if not at capacity */}
          {canAddMembers && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={addRandomMember}
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-red-accent transition-all duration-200 hover:scale-110"
                  style={{ marginLeft: crewSession.members.length > 0 ? "-4px" : "0" }}
                >
                  <UserPlus className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="rounded-app-sm">
                <div className="text-xs">Invite crew member</div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Crew status */}
        <div className="mt-2 text-xs text-muted-foreground">
          {onlineMembers.length > 0 ? (
            <span className="text-vibrant-green">{onlineMembers.length} online</span>
          ) : (
            <span>All members offline</span>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
