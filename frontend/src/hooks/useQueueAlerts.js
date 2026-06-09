import { useEffect, useRef } from 'react'

let audioCtx = null

function getAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      return null
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// Resume on user gesture
if (typeof window !== 'undefined') {
  const resume = () => { if (audioCtx) audioCtx.resume() }
  window.addEventListener('touchstart', resume)
  window.addEventListener('click', resume)
}

function playChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    ;[523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const t = ctx.currentTime + i * 0.15
      gain.gain.setValueAtTime(0.3, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  } catch (e) {
    console.warn('[Alert] Chime failed:', e.message)
  }
}

function playBeep() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'square'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch (e) {
    console.warn('[Alert] Beep failed:', e.message)
  }
}

export function useQueueAlerts(barberData) {
  const prevCountRef   = useRef(null)
  const prevCurrentRef = useRef(null)

  useEffect(() => {
    // Single guard at the top — if null, do nothing
    if (!barberData) return

    const count   = barberData.waitingList?.length ?? 0
    const serving = barberData.currentCustomer?.id ?? null

    if (prevCountRef.current === null) {
      prevCountRef.current   = count
      prevCurrentRef.current = serving
      return
    }

    if (count > prevCountRef.current) {
      playChime()
    }

    if (serving !== prevCurrentRef.current && count > 0) {
      setTimeout(playBeep, 500)
    }

    prevCountRef.current   = count
    prevCurrentRef.current = serving

  // Safe dependency array — optional chaining returns undefined not error
  }, [
    barberData,
    barberData?.waitingList?.length,
    barberData?.currentCustomer?.id,
  ])
}