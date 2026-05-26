import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { motion } from 'framer-motion'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { email?: string } | null
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: state?.email ?? '' },
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const { confirm_password: _, ...rest } = data
      await authApi.resetPassword(rest)
      toast.success('Password reset! Please sign in with your new password.')
      navigate('/login')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  // Stagger animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="mb-8 text-center sm:text-left">
        <div className="mb-6 flex justify-center sm:justify-start">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100/50 shadow-inner"
          >
            <KeyRound className="h-7 w-7 text-indigo-600" />
          </motion.div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Set new password</h1>
        <p className="mt-2 text-sm text-gray-500">
          Create a strong password for your account.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <motion.div variants={itemVariants}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Input
            label="OTP Code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            error={errors.otp?.message}
            className="font-mono text-center text-lg tracking-widest"
            {...register('otp')}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="relative">
          <Input
            label="New password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.new_password?.message}
            hint="Min 8 chars with uppercase, lowercase, number & special character"
            className="pr-10"
            {...register('new_password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.confirm_password?.message}
            {...register('confirm_password')}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="pt-2">
          <Button type="submit" loading={isSubmitting} icon={<KeyRound className="h-4 w-4" />} className="w-full mt-2">
            Reset password
          </Button>
        </motion.div>

        <motion.p variants={itemVariants} className="text-center text-sm text-gray-500 mt-2">
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
            Back to sign in
          </Link>
        </motion.p>
      </form>
    </motion.div>
  )
}
