import { useEffect } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { t } = useTranslation()
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const targetPath = redirect || '/'
      navigate({ to: targetPath, replace: true })
    }
  }, [user, loading, navigate, redirect])

  // Show loading state while checking auth
  if (loading) {
    return (
      <AuthLayout>
        <div className='flex items-center justify-center py-12'>
          <div className='flex flex-col items-center gap-2'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>{t('auth.signIn.loading')}</p>
          </div>
        </div>
      </AuthLayout>
    )
  }

  // Don't render login form if user is logged in (will redirect)
  if (user) {
    return null
  }

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>{t('auth.signIn.title')}</CardTitle>
          <CardDescription>
            {t('auth.signIn.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            {t('auth.signIn.termsText')}{' '}
            <a
              href='/terms'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('auth.signIn.termsOfService')}
            </a>{' '}
            {t('auth.signIn.and')}{' '}
            <a
              href='/privacy'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('auth.signIn.privacyPolicy')}
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
