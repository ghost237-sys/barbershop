import { useEffect, useRef } from 'react'

// Generates a pleasant chime sound using Web Audio API
// No external audio files needed
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    const frequencies = [523, 659, 784]  // C, E, G — a pleasant chord

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator()
      const gainNode   = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = freq
      oscillator.type = 'sine'

      const startTime = ctx.currentTime + i * 0.15
      gainNode.gain.setValueAtTime(0.3, startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5)

      oscillator.start(startTime)
      oscillator.stop(startTime + 0.5)
    })
  } catch (err) {
    console.warn('[Alert] Could not play sound:', err)
  }
}

function playUrgentBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode   = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 880
    oscillator.type = 'square'

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  } catch (err) {
    console.warn('[Alert] Could not play beep:', err)
  }
}

export function useQueueAlerts(barberData) {
  const prevWaitingCountRef = useRef(null)
  const prevCurrentRef      = useRef(null)

  useEffect(() => {
    if (!barberData) return

    const currentCount   = barberData.waitingList.length
    const currentServing = barberData.currentCustomer?.id

    // First load — just record state
    if (prevWaitingCountRef.current === null) {
      prevWaitingCountRef.current = currentCount
      prevCurrentRef.current      = currentServing
      return
    }

    // New customer joined the queue
    if (currentCount > prevWaitingCountRef.current) {
      playChime()
      console.log('[Alert] New customer in queue — chime played')
    }

    // Current customer changed — barber pressed Next
    // Play a reminder if queue is not empty
    if (
      currentServing !== prevCurrentRef.current &&
      currentCount > 0
    ) {
      // Small delay then remind barber there are people waiting
      setTimeout(() => playUrgentBeep(), 500)
    }

    prevWaitingCountRef.current = currentCount
    prevCurrentRef.current      = currentServing

  }, [barberData?.waitingList.length, barberData?.currentCustomer?.id])
}