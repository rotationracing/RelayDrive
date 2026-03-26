"use client"

import { isGameProcessRunning, setActiveGame as setActiveGameCommand } from '@/app/tauri-bridge'
import { listen } from '@tauri-apps/api/event'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type ProcessStatusEvent =
  | boolean
  | {
      gameId?: string
      game_id?: string
      running?: boolean
      status?: boolean
    }

interface ProcessContextType {
  activeGame: string | null
  isRunning: boolean
  isLoading: boolean
  error: string | null
  monitorGame: (gameId: string) => Promise<void>
  stopMonitoring: () => void
  checkProcess: (gameId?: string) => Promise<void>
}

const POLL_INTERVAL_MS = 5000

export const ProcessContext = createContext<ProcessContextType>({
  activeGame: null,
  isRunning: false,
  isLoading: false,
  error: null,
  monitorGame: async () => {},
  stopMonitoring: () => {},
  checkProcess: async () => {},
})

export function ProcessProvider({ children }: { children: React.ReactNode }) {
  const [activeGame, setActiveGameState] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentGameRef = useRef<string | null>(null)

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const checkProcess = useCallback(async (gameId?: string) => {
    const target = (gameId ?? currentGameRef.current)?.trim()
    if (!target) {
      return
    }
    setIsLoading(true)
    try {
      const running = await isGameProcessRunning(target)
      setIsRunning(running)
      setError(null)
    } catch (err) {
      console.error('Failed to check process status:', err)
      setError('Failed to check process status')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const startPoll = useCallback(
    (gameId: string) => {
      clearPoll()
      pollRef.current = setInterval(() => {
        void checkProcess(gameId)
      }, POLL_INTERVAL_MS)
    },
    [checkProcess, clearPoll],
  )

  const monitorGame = useCallback(
    async (gameId: string) => {
      const normalized = gameId.trim()
      if (!normalized) {
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        await setActiveGameCommand(normalized)
        currentGameRef.current = normalized
        setActiveGameState(normalized)
        await checkProcess(normalized)
        startPoll(normalized)
      } catch (err) {
        console.error('Failed to check process status:', err)
        setError('Failed to check process status')
        setIsLoading(false)
      }
    },
    [checkProcess, startPoll],
  )

  const stopMonitoring = useCallback(() => {
    clearPoll()
    currentGameRef.current = null
    setActiveGameState(null)
    setIsRunning(false)
    setIsLoading(false)
    setError(null)
  }, [clearPoll])

  useEffect(() => {
    if (!currentGameRef.current) {
      return
    }
    let isMounted = true
    let unlisten: (() => void) | undefined
    ;(async () => {
      try {
        unlisten = await listen<ProcessStatusEvent>('process_status', (event) => {
          if (!isMounted) {
            return
          }
          const payload = event.payload
          const active = currentGameRef.current
          if (!active) {
            return
          }
          if (typeof payload === 'boolean') {
            setIsRunning(payload)
            setIsLoading(false)
            setError(null)
            return
          }
          if (payload && typeof payload === 'object') {
            const data = payload as Record<string, unknown>
            const payloadGame =
              typeof data.gameId === 'string'
                ? data.gameId
                : typeof data.game_id === 'string'
                  ? data.game_id
                  : null
            if (payloadGame && payloadGame.toLowerCase() !== active.toLowerCase()) {
              return
            }
            const runningValue =
              typeof data.running === 'boolean'
                ? data.running
                : typeof data.status === 'boolean'
                  ? data.status
                  : undefined
            if (typeof runningValue === 'boolean') {
              setIsRunning(runningValue)
              setIsLoading(false)
              setError(null)
            }
          }
        })
      } catch (err) {
        console.error('Failed to set up process status listener:', err)
      }
    })()
    return () => {
      isMounted = false
      if (unlisten) {
        unlisten()
      }
    }
  }, [activeGame])

  useEffect(() => {
    return () => {
      clearPoll()
    }
  }, [clearPoll])

  const value = useMemo(
    () => ({
      activeGame,
      isRunning,
      isLoading,
      error,
      monitorGame,
      stopMonitoring,
      checkProcess,
    }),
    [activeGame, isRunning, isLoading, error, monitorGame, stopMonitoring, checkProcess],
  )

  return <ProcessContext.Provider value={value}>{children}</ProcessContext.Provider>
}

export const useProcess = () => {
  const context = useContext(ProcessContext)
  if (context === undefined) {
    throw new Error('useProcess must be used within a ProcessProvider')
  }
  return context
}
