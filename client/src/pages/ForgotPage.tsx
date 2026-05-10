import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/Logo'
import * as api from '@/lib/api'

const schema = z.object({ email: z.string().email('Enter a valid email') })
type Form = z.infer<typeof schema>

export function ForgotPage() {
  const navigate = useNavigate()
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: Form) => {
    setSubmitting(true)
    try {
      await api.forgotPassword(data)
      setDone(true)
    } catch {
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-sm">
        <Logo className="mb-8" />
        {!done ? (
          <>
            <h1 className="text-2xl font-semibold text-ink">Reset your password</h1>
            <p className="mt-1 text-sm text-muted">
              Enter your email and we&apos;ll send you a link to reset it.
            </p>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                error={form.formState.errors.email?.message}
                {...form.register('email')}
              />
              <Button type="submit" className="w-full" loading={submitting}>
                Send reset link
              </Button>
            </form>
          </>
        ) : (
          <div className="card p-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="text-base font-semibold text-ink">Check your inbox</h2>
            <p className="mt-1 text-sm text-muted">
              If an account exists, we sent a reset link.
            </p>
            <Button variant="secondary" className="mt-5 w-full" onClick={() => navigate('/login')}>
              Back to sign in
            </Button>
          </div>
        )}
        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
