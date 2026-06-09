import { useEffect, useRef } from 'react'

let audioCtx = null

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  // Resume if suspended — required after user gesture
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playChime() {
  try {
    const ctx = getAudioContext()
    const frequencies = [523, 659, 784]

    frequencies.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
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
  } catch (err) {
    console.warn('[Alert] Could not play chime:', err.message)
  }
}

function playBeep() {
  try {
    const ctx = getAudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'square'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch (err) {
    console.warn('[Alert] Could not play beep:', err.message)
  }
}

// Resume AudioContext on first user interaction
// This satisfies Chrome's autoplay policy
if (typeof window !== 'undefined') {
  const resumeAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
  }
  window.addEventListener('touchstart', resumeAudio, { once: false })
  window.addEventListener('click', resumeAudio, { once: false })
}

export function useQueueAlerts(barberData) {
  const prevWaitingCountRef = useRef(null)
  const prevCurrentRef      = useRef(null)

  useEffect(() => {
    // Guard — barberData not ready yet
    if (!barberData) return

    const currentCount   = barberData.waitingList?.length ?? 0
    const currentServing = barberData.currentCustomer?.id ?? null

    // First load — record baseline without alerting
    if (prevWaitingCountRef.current === null) {
      prevWaitingCountRef.current = currentCount
      prevCurrentRef.current      = currentServing
      return
    }

    // New customer joined
    if (currentCount > prevWaitingCountRef.current) {
      playChime()
    }

    // Current customer changed and queue not empty
    if (
      currentServing !== prevCurrentRef.current &&
      currentCount > 0
    ) {
      setTimeout(() => playBeep(), 500)
    }

    prevWaitingCountRef.current = currentCount
    prevCurrentRef.current      = currentServing

  }, [barberData?.waitingList?.length, barberData?.currentCustomer?.id])
}