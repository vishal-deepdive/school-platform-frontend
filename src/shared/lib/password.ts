/**
 * Password requirement checks — the single source of truth for what makes a
 * valid password on the client. Mirrors the PASSWORD_REGEX in validators.ts so
 * the live meter and the submit-time validation never disagree.
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "digit", label: "One number", test: (v) => /\d/.test(v) },
  {
    id: "special",
    label: "One special character",
    test: (v) => /[!@#$%^&*()\-=_+[\]{};:'",.<>/?\\|`~]/.test(v),
  },
];

export type PasswordLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  /** Requirements satisfied, in rule order. */
  passed: string[];
  /** How many of the required rules are met (0–5). */
  metCount: number;
  /** Bucketed strength for the meter: 0 (empty) … 4 (strong). */
  level: PasswordLevel;
  label: "" | "Weak" | "Fair" | "Good" | "Strong";
}

/**
 * Buckets a password into a 0–4 strength level. All five rules met is the floor
 * for "Good"; length ≥ 12 on top of that earns "Strong". Anything failing a
 * required rule caps at "Fair" — you can't be "strong" and invalid.
 */
export function evaluatePassword(value: string): PasswordStrength {
  const passed = PASSWORD_RULES.filter((r) => r.test(value)).map((r) => r.id);
  const metCount = passed.length;

  let level: PasswordLevel = 0;
  if (value.length === 0) level = 0;
  else if (metCount <= 2) level = 1;
  else if (metCount <= 4) level = 2;
  else if (value.length < 12) level = 3;
  else level = 4;

  const label = (["", "Weak", "Fair", "Good", "Strong"] as const)[level];
  return { passed, metCount, level, label };
}
