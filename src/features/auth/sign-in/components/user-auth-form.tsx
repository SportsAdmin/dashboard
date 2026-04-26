import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { IconFacebook, IconGithub } from '@/assets/brand-icons'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { login } from '@/services/auth'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const getFormSchema = (t: (key: string) => string) => z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? t('auth.signIn.emailRequired') : undefined),
  }),
  password: z
    .string()
    .min(1, t('auth.signIn.passwordRequired'))
    .min(7, t('auth.signIn.passwordMin')),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const formSchema = getFormSchema(t)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const response = await login(data.email, data.password)

      if (!response.success) {
        setIsLoading(false)
        toast.error(t('auth.signIn.signInFailed'), {
          description: response.error || t('auth.signIn.invalidCredentials'),
        })
        return
      }

      if (response.user) {
        // Set user and access token in store
        const userWithExpiry = {
          accountNo: response.user.id,
          email: response.user.email,
          role: response.user.role || ['user'],
          exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        }

        auth.setUser(userWithExpiry)
        auth.setAccessToken('supabase-session-active')

        toast.success(t('auth.signIn.signInSuccess'), {
          description: t('auth.signIn.welcomeBack', { email: response.user.email }),
        })

        // Redirect to the stored location or default to dashboard
        const targetPath = redirectTo || '/'
        navigate({ to: targetPath, replace: true })
      }
    } catch (error) {
      setIsLoading(false)
      toast.error(t('auth.signIn.signInFailed'), {
        description:
          error instanceof Error ? error.message : t('auth.signIn.unexpectedError'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.signIn.emailLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('auth.signIn.emailPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>{t('auth.signIn.passwordLabel')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder={t('auth.signIn.passwordPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='absolute end-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75'
              >
                {t('auth.signIn.forgotPassword')}
              </Link>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          {t('auth.signIn.signInButton')}
        </Button>

        <div className='relative my-2'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background px-2 text-muted-foreground'>
              {t('auth.signIn.orContinueWith')}
            </span>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconGithub className='h-4 w-4' /> GitHub
          </Button>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconFacebook className='h-4 w-4' /> Facebook
          </Button>
        </div>
      </form>
    </Form>
  )
}
