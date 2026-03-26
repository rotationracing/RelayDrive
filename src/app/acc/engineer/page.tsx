"use client"

import type React from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Brain, Mic, MicOff, Send, Settings, TrendingUp, Zap } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: string
  suggestions?: string[]
}

export default function ACCEngineerRoute() {
  return <EngineerPage />
}

function EngineerPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Hello! I'm your AI Race Engineer. I'm connected to your telemetry and ready to help optimize your performance. What would you like to know?",
      timestamp: new Date().toLocaleTimeString(),
      suggestions: ["What's my current delta?", "Analyze my last lap", "Setup recommendations", "Tire strategy advice"],
    },
  ])
  const [input, setInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        {
          content:
            "Based on your current telemetry, I can see you're losing 0.3 seconds in sector 2. Your braking point at turn 4 could be optimized - try braking 10 meters later and carrying more speed through the apex.",
          suggestions: ["Show me the data", "More braking tips", "What about tire temps?"],
        },
        {
          content:
            "Your lap time is currently 1:42.8. The optimal theoretical time based on your car's performance is 1:41.9. The biggest gains are in cornering efficiency - you're losing time on corner exit.",
          suggestions: ["Setup changes?", "Driving technique tips", "Compare to aliens"],
        },
        {
          content:
            "I recommend increasing rear wing by 2 clicks for better stability in the high-speed corners. Your current setup is causing understeer in turns 7-9. Also consider softening the rear anti-roll bar.",
          suggestions: ["Apply changes", "Explain the physics", "Alternative setups"],
        },
        {
          content:
            "Your tire temperatures are looking good - fronts at 98°C, rears at 102°C. You can push harder for the next 5 laps before considering a pit stop. Current degradation rate suggests optimal pit window in 8-12 laps.",
          suggestions: ["Pit strategy", "Tire pressure changes", "Weather impact"],
        },
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: randomResponse.content,
        timestamp: new Date().toLocaleTimeString(),
        suggestions: randomResponse.suggestions,
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Race Engineer</h1>
        <p className="text-muted-foreground">Your intelligent racing companion with real-time telemetry analysis.</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-panel">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-vibrant-green/10 rounded-control">
                <Brain className="w-5 h-5 text-vibrant-green" />
              </div>
              <div>
                <div className="font-medium">AI Status</div>
                <div className="text-sm text-muted-foreground">Active & Learning</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-panel">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-control">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium">Performance</div>
                <div className="text-sm text-muted-foreground">+0.8s improvement</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-panel">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-500/10 rounded-control">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <div className="font-medium">Alerts</div>
                <div className="text-sm text-muted-foreground">2 recommendations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <Card className="rounded-panel flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Race Engineer Chat
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="rounded-control bg-status-online w-fit">
                <Zap className="w-3 h-3 mr-1" />
                Live Data
              </Badge>
              <Button variant="ghost" size="sm" className="rounded-control">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Ask questions about your performance, get setup advice, or request strategy recommendations
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex space-x-3 max-w-[80%] ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
                >
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback
                      className={message.type === "user" ? "bg-red-accent text-white" : "bg-blue-500 text-white"}
                    >
                      {message.type === "user" ? "U" : "AI"}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`rounded-panel p-3 ${
                      message.type === "user" ? "bg-red-accent text-white" : "bg-muted"
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div
                      className={`text-xs mt-1 ${message.type === "user" ? "text-red-100" : "text-muted-foreground"}`}
                    >
                      {message.timestamp}
                    </div>

                    {message.suggestions && (
                      <div className="mt-3 space-y-1">
                        <div className="text-xs font-medium opacity-70">Quick actions:</div>
                        <div className="flex flex-wrap gap-1">
                          {message.suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="secondary"
                              size="sm"
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="text-xs rounded-control h-6"
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-500 text-white">AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-panel p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsListening(!isListening)}
              className={`rounded-panel ${isListening ? "bg-red-accent text-white" : ""}`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask your race engineer anything..."
              className="flex-1 rounded-panel"
            />

            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              className="btn-primary rounded-panel"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
