import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { schoolOnboardingSchema, type SchoolOnboardingFormData } from '@/lib/validators'
import type { StepIndex } from '../components/StepIndicator'

const STORAGE_KEY = 'onboarding_form_data'
const STEP_KEY = 'onboarding_current_step'

export function useOnboardingForm() {
  // Load initial step
  const [currentStep, setCurrentStepState] = useState<StepIndex>(() => {
    const savedStep = sessionStorage.getItem(STEP_KEY)
    if (savedStep) {
      const parsed = parseInt(savedStep, 10)
      if (parsed >= 1 && parsed <= 5) return parsed as StepIndex
    }
    return 1
  })

  // Load initial data
  const defaultValues: Partial<SchoolOnboardingFormData> = {
    board: '' as any,
    school_type: '' as any,
    state: '',
    established_year: '',
    phone: '',
    address_line_2: '',
    medium_of_instruction: '',
    classes_from: '',
    classes_to: '',
    udise_code: '',
    terms: false,
  }

  const savedData = sessionStorage.getItem(STORAGE_KEY)
  const initialData = savedData ? { ...defaultValues, ...JSON.parse(savedData) } : defaultValues

  const methods = useForm<SchoolOnboardingFormData>({
    resolver: zodResolver(schoolOnboardingSchema),
    defaultValues: initialData,
    mode: 'onTouched',
  })

  // Subscribe to changes and save to sessionStorage
  useEffect(() => {
    const subscription = methods.watch((value) => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    })
    return () => subscription.unsubscribe()
  }, [methods])

  // Custom step setter that also persists
  const setCurrentStep = useCallback((step: StepIndex | ((prev: StepIndex) => StepIndex)) => {
    setCurrentStepState((prev) => {
      const nextStep = typeof step === 'function' ? step(prev) : step
      sessionStorage.setItem(STEP_KEY, String(nextStep))
      return nextStep
    })
  }, [])

  return {
    methods,
    currentStep,
    setCurrentStep,
  }
}
