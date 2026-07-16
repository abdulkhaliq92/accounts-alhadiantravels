import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/Logo'
import * as api from '@/lib/api'
import { useAuth } from '@/lib/auth'

const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type SignIn = z.infer<typeof signInSchema>

export function LoginPage() {
  const session = useAuth((s) => s.session)
  const setSession = useAuth((s) => s.setSession)
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (session?.token) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  const signIn = useForm<SignIn>({ resolver: zodResolver(signInSchema) })

  const onSignIn = async (data: SignIn) => {
    setSubmitting(true)
    try {
      const res = await api.signIn(data)
      setSession(res.data)
      toast.success('Welcome back')
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="hidden bg-ink p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-fg p-1.5">
              <img src="/alhadian-travels-logo.svg" alt="Alhadian Travels" className="h-full w-full" draggable={false} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-accent-fg">
                Alhadian Travels
              </div>
              <div className="text-[11px] uppercase tracking-wider text-accent-fg/70">
                Invoicing
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="max-w-md text-3xl font-semibold leading-tight text-accent-fg">
              Beautiful invoices.
              <br />
              Effortless tracking.
            </h2>
            <p className="max-w-sm text-sm text-accent-fg/70">
              Create invoices, record payments, and keep clients organized in one minimal,
              focused workspace.
            </p>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-1 w-10 rounded-full bg-accent-fg/20" />
              ))}
            </div>
          </div>
          <div className="text-xs text-accent-fg/50">© {new Date().getFullYear()} Alhadian Travels</div>
        </div>

        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden mb-8">
              <Logo />
            </div>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
              <p className="mt-1 text-sm text-muted">Sign in to manage invoices and clients.</p>
            </div>

            <form onSubmit={signIn.handleSubmit(onSignIn)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                error={signIn.formState.errors.email?.message}
                {...signIn.register('email')}
              />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Password</label>
                  <Link to="/forgot" className="text-xs text-ink hover:underline">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input pr-10"
                    {...signIn.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-accent-soft"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {signIn.formState.errors.password && (
                  <p className="text-xs text-danger">{signIn.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" loading={submitting} className="w-full">
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              Need an account? Ask an admin to create one for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
