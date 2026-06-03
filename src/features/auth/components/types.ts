import type { TokenResponse } from '@/types/auth'

export interface NavProps {
  navigate: (path: string, options?: { state?: unknown }) => void
}

export interface CompleteFormProps {
  googleToken: string
  prefillName: string
  onSuccess: (tokens: TokenResponse) => void
}

export interface ParentFormProps {
  googleToken: string
  prefillName: string
  onPending: (message: string) => void
}
