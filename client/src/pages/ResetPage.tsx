import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/Logo'
import * as api from '@/lib/api'

const schema = z
  .object({
    password: z.string().min(6, 'At least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
type Form = z.infer<typeof schema>

export function ResetPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: Form) => {
    setSubmitting(true)
    try {
      await api.resetPassword({ password: data.password, token })
      toast.success('Password updated')
      navigate('/login', { replace: true })
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Reset link is invalid or expired')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-sm">
        <Logo className="mb-8" />
        <h1 className="text-2xl font-semibold text-ink">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted">Make it at least 6 characters.</p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={form.formState.errors.confirmPassword?.message}
            {...form.register('confirmPassword')}
          />
          <Button type="submit" className="w-full" loading={submitting}>
            Update password
          </Button>
        </form>
      </div>
    </div>
  )
}
