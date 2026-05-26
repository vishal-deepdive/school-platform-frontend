import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validators'
import { authApi } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { motion } from 'framer-motion'

export function ForgotPasswordPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await authApi.forgotPassword(data)
      toast.success('OTP sent to your email!')
      navigate('/verify-otp', { state: { email: data.email, purpose: 'reset_password' } })
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
            <Mail className="h-7 w-7 text-indigo-600" />
          </motion.div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Forgot password?</h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter your email and we'll send you a reset OTP.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <motion.div variants={itemVariants}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            error={errors.email?.message}
            {...register('email')}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="pt-2">
          <Button type="submit" loading={isSubmitting} icon={<Mail className="h-4 w-4" />} className="w-full mt-2">
            Send reset OTP
          </Button>
        </motion.div>

        <motion.p variants={itemVariants} className="text-center text-sm text-gray-500 mt-2">
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
            Sign in
          </Link>
        </motion.p>
      </form>
    </motion.div>
  )
}
