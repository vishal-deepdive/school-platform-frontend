import { useState, useEffect, useCallback } from 'react';

const COOLDOWN_SECONDS = 90;

export function useOtpCooldown(email: string, enableTimer: boolean = true) {
  const [timeLeft, setTimeLeft] = useState(0);
  const storageKey = `otp_cooldown_${email.toLowerCase()}`;

  useEffect(() => {
    if (!email || !enableTimer) return;
    const lastSent = localStorage.getItem(storageKey);
    if (lastSent) {
      const elapsed = Math.floor((Date.now() - parseInt(lastSent, 10)) / 1000);
      if (elapsed < COOLDOWN_SECONDS) {
        setTimeLeft(COOLDOWN_SECONDS - elapsed);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }, [email, storageKey, enableTimer]);

  useEffect(() => {
    if (timeLeft <= 0 || !enableTimer) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, enableTimer]);

  const startCooldown = useCallback(() => {
    if (!email) return;
    localStorage.setItem(storageKey, Date.now().toString());
    if (enableTimer) {
      setTimeLeft(COOLDOWN_SECONDS);
    }
  }, [email, storageKey, enableTimer]);

  return { timeLeft, startCooldown, isCoolingDown: timeLeft > 0 };
}
