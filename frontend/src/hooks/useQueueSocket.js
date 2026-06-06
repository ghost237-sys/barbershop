import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000'
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

// How long to wait before declaring the WebSocket dead
// and switching to HTTP polling
const WS_TIMEOUT_MS = 5000

// How often to poll via HTTP when WebSocket is down
const FALLBACK_POLL_INTERVAL_MS = 4000

export function useQueueSocket() {
  const [queueData, setQueueData] = useState(null)
  const [connected, setConnected] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)

  const wsRef = useRef(null)
  const timeoutRef = useRef(null)       // fires if WS goes silent for 5s
  const fallbackRef = useRef(null)      // interval for HTTP polling
  const reconnectRef = useRef(null)     // timeout for WS reconnect attempt

  // ── HTTP fallback: fetch queue state via REST ──────────────────────────
  const fetchViaHttp = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/queue/`)
      setQueueData(res.data.barbers)
    } catch (err) {
      console.warn('[Fallback] HTTP fetch failed:', err.message)
    }
  }, [])

  const startFallbackPolling = useCallback(() => {
    if (fallbackRef.current) return  // already polling
    setUsingFallback(true)
    fetchViaHttp()  // immediate fetch
    fallbackRef.current = setInterval(fetchViaHttp, FALLBACK_POLL_INTERVAL_MS)
  }, [fetchViaHttp])

  const stopFallbackPolling = useCallback(() => {
    if (fallbackRef.current) {
      clearInterval(fallbackRef.current)
      fallbackRef.current = null
    }
    setUsingFallback(false)
  }, [])

  // ── WebSocket setup ────────────────────────────────────────────────────
  const connect = useCallback(() => {
    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null  // prevent recursive reconnect
      wsRef.current.close()
    }

    const ws = new WebSocket(`${WS_BASE}/ws/queue/`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      stopFallbackPolling()

      // Start the silence detector —
      // if we don't receive a message within WS_TIMEOUT_MS, fall back to HTTP
      resetSilenceTimer()
    }

    ws.onmessage = (event) => {
      // We got a message — reset the silence timer
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
      // Error doesn't mean disconnect yet — onclose will fire next
      console.warn('[WebSocket] Error occurred')
    }

    ws.onclose = () => {
      setConnected(false)
      clearSilenceTimer()

      // Immediately start HTTP fallback so UI doesn't freeze
      startFallbackPolling()

      // Try to reconnect WebSocket after 3 seconds
      reconnectRef.current = setTimeout(() => {
        console.log('[WebSocket] Attempting reconnect...')
        connect()
      }, 3000)
    }
  }, [stopFallbackPolling, startFallbackPolling])

  // ── Silence timer ──────────────────────────────────────────────────────
  // If the WebSocket is technically "open" but stops sending messages
  // (e.g. server froze, network partition), fall back to HTTP after 5 seconds
  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer()
    timeoutRef.current = setTimeout(() => {
      console.warn('[WebSocket] Silent for 5s — switching to HTTP fallback')
      startFallbackPolling()
    }, WS_TIMEOUT_MS)
  }, [startFallbackPolling])

  const clearSilenceTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // ── Lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    connect()

    return () => {
      // Cleanup on unmount
      clearSilenceTimer()
      stopFallbackPolling()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [])

  return {
    queueData,       // the live queue state
    connected,       // true if WebSocket is connected
    usingFallback,   // true if falling back to HTTP polling
  }
}
