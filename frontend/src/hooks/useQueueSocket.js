import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000'
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

const WS_TIMEOUT_MS = 5000
const FALLBACK_POLL_INTERVAL_MS = 4000

export function useQueueSocket() {
  const [queueData, setQueueData] = useState(null)
  const [connected, setConnected] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)

  const wsRef = useRef(null)
  const timeoutRef = useRef(null)
  const fallbackRef = useRef(null)
  const reconnectRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)  // ← tracks backoff attempts

  const fetchViaHttp = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/queue/`)
      setQueueData(res.data.barbers)
    } catch (err) {
      console.warn('[Fallback] HTTP fetch failed:', err.message)
    }
  }, [])

  const startFallbackPolling = useCallback(() => {
    if (fallbackRef.current) return
    setUsingFallback(true)
    fetchViaHttp()
    fallbackRef.current = setInterval(fetchViaHttp, FALLBACK_POLL_INTERVAL_MS)
  }, [fetchViaHttp])

  const stopFallbackPolling = useCallback(() => {
    if (fallbackRef.current) {
      clearInterval(fallbackRef.current)
      fallbackRef.current = null
    }
    setUsingFallback(false)
  }, [])

  const clearSilenceTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer()
    timeoutRef.current = setTimeout(() => {
      console.warn('[WebSocket] Silent for 5s — switching to HTTP fallback')
      startFallbackPolling()
    }, WS_TIMEOUT_MS)
  }, [clearSilenceTimer, startFallbackPolling])

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    const ws = new WebSocket(`${WS_BASE}/ws/queue/`)
    wsRef.current = ws

    // ── onopen: reset backoff counter on successful connection ──
    ws.onopen = () => {
      setConnected(true)
      reconnectAttemptsRef.current = 0  // reset backoff on success
      stopFallbackPolling()
      resetSilenceTimer()
    }

    ws.onmessage = (event) => {
      resetSilenceTimer()
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'queue_update') {
          setQueueData(payload.data)
        }
      } catch (e) {
        console.warn('[WebSocket] Could not parse message:', e)
      }
    }

    ws.onerror = () => {
      console.warn('[WebSocket] Error occurred')
    }

    // ── onclose: exponential backoff reconnection ──
    ws.onclose = () => {
      setConnected(false)
      clearSilenceTimer()

      // Immediately start HTTP fallback so UI doesn't freeze
      startFallbackPolling()

      // Backoff: 3s → 6s → 12s → 24s → capped at 30s
      const attempts = reconnectAttemptsRef.current
      const delay = Math.min(3000 * Math.pow(2, attempts), 30000)
      reconnectAttemptsRef.current += 1

      console.log(`[WebSocket] Reconnecting in ${delay / 1000}s (attempt ${attempts + 1})`)

      reconnectRef.current = setTimeout(() => {
        connect()
      }, delay)
    }
  }, [stopFallbackPolling, startFallbackPolling, resetSilenceTimer, clearSilenceTimer])

  useEffect(() => {
    connect()

    return () => {
      clearSilenceTimer()
      stopFallbackPolling()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [])

  return { queueData, connected, usingFallback }
}