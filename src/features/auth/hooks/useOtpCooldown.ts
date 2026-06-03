import { useState, useEffect, useCallback } from 'react'

const COOLDOWN_SECONDS = 90

function getRemainingSeconds(storageKey: string): number {
  const lastSent = localStorage.getItem(storageKey)
  if (!lastSent) return 0
  const elapsed = Math.floor((Date.now() - parseInt(lastSent, 10)) / 1000)
  if (elapsed < COOLDOWN_SECONDS) return COOLDOWN_SECONDS - elapsed
  localStorage.removeItem(storageKey)
  return 0
}

export function useOtpCooldown(
  email: string,
  purpose: string = 'verify_email',
  enableTimer: boolean = true,
) {
  const storageKey = `otp_cooldown_${purpose}_${email.toLowerCase()}`
  const [timeLeft, setTimeLeft] = useState(0)

  // Restore persisted cooldown whenever email or purpose changes
  useEffect(() => {
    if (!email || !enableTimer) { setTimeLeft(0); return }
    setTimeLeft(getRemainingSeconds(storageKey))
  }, [email, storageKey, enableTimer])

  // Count down one tick at a time — avoids creating a new interval every second
  useEffect(() => {
    if (timeLeft <= 0 || !enableTimer) return
    const id = setTimeout(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, enableTimer])

  const startCooldown = useCallback(() => {
    if (!email) return
    localStorage.setItem(storageKey, Date.now().toString())
    if (enableTimer) setTimeLeft(COOLDOWN_SECONDS)
  }, [email, storageKey, enableTimer])

  return { timeLeft, startCooldown, isCoolingDown: timeLeft > 0 }
}
