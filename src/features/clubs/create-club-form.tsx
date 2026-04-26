import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { createClubWithAdmin } from '@/services/clubs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// ============================================
// Form Schema with Validation
// ============================================

const createClubFormSchema = (t: (key: string) => string) => z.object({
  // Club Info
  clubName: z
    .string()
    .min(2, t('clubs.form.clubNameMin'))
    .max(100, t('clubs.form.clubNameMax')),
  city: z
    .string()
    .min(2, t('clubs.form.cityMin'))
    .max(100, t('clubs.form.cityMax')),
  logoUrl: z
    .string()
    .url(t('clubs.form.logoUrlInvalid'))
    .optional()
    .or(z.literal('')),

  // Admin User Info
  adminName: z
    .string()
    .min(2, t('clubs.form.adminNameMin'))
    .max(100, t('clubs.form.adminNameMax')),
  adminEmail: z
    .string()
    .email(t('clubs.form.adminEmailInvalid')),
  adminPassword: z
    .string()
    .min(8, t('clubs.form.passwordMin'))
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      t('clubs.form.passwordPattern')
    ),
  confirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: t('clubs.form.passwordsNoMatch'),
  path: ['confirmPassword'],
})

type CreateClubFormValues = z.infer<ReturnType<typeof createClubFormSchema>>

// ============================================
// Component
// ============================================

export function CreateClubForm() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const router = useRouter()

  const form = useForm<CreateClubFormValues>({
    resolver: zodResolver(createClubFormSchema(t)),
    defaultValues: {
      clubName: '',
      city: '',
      logoUrl: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: CreateClubFormValues) => {
    setIsLoading(true)

    try {
      const response = await createClubWithAdmin({
        club: {
          name: values.clubName,
          city: values.city,
          logo_url: values.logoUrl || null,
        },
        admin: {
          name: values.adminName,
          email: values.adminEmail,
          password: values.adminPassword,
        },
      })

      if (response.success) {
        toast.success(t('clubs.form.success'), {
          description: t('clubs.form.successDescription', {
            clubName: values.clubName,
            adminEmail: values.adminEmail,
          }),
        })

        // Reset form
        form.reset()

        // Invalidate the clubs route to force data reload
        await router.invalidate()

        // Redirect to clubs list
        navigate({
          to: '/clubs',
          replace: true,
        })
      } else {
        toast.error(t('clubs.form.error'), {
          description: response.error || t('clubs.form.errorUnknown'),
        })
      }
    } catch (error) {
      toast.error(t('clubs.form.error'), {
        description:
          error instanceof Error
            ? error.message
            : t('clubs.form.errorUnexpected'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className='mx-auto max-w-2xl'>
      <CardHeader>
        <CardTitle>{t('clubs.form.title')}</CardTitle>
        <CardDescription>
          {t('clubs.form.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Club Information Section */}
            <div className='space-y-4'>
              <div>
                <h3 className='text-lg font-medium'>
                  {t('clubs.form.clubInformation')}
                </h3>
                <p className='text-sm text-muted-foreground'>
                  {t('clubs.form.clubInfoDescription')}
                </p>
              </div>

              <FormField
                control={form.control}
                name='clubName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clubs.form.clubName')} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('clubs.form.clubNamePlaceholder')}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('clubs.form.clubNameDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='city'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clubs.form.city')} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('clubs.form.cityPlaceholder')}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('clubs.form.cityDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='logoUrl'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clubs.form.logoUrl')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('clubs.form.logoUrlPlaceholder')}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('clubs.form.logoUrlDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Admin User Section */}
            <div className='space-y-4'>
              <div>
                <h3 className='text-lg font-medium'>
                  {t('clubs.form.adminUser')}
                </h3>
                <p className='text-sm text-muted-foreground'>
                  {t('clubs.form.adminUserDescription')}
                </p>
              </div>

              <FormField
                control={form.control}
                name='adminName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clubs.form.adminName')} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('clubs.form.adminNamePlaceholder')}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('clubs.form.adminNameDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='adminEmail'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clubs.form.adminEmail')} *</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder={t('clubs.form.adminEmailPlaceholder')}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('clubs.form.adminEmailDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='adminPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clubs.form.password')} *</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder={t('clubs.form.passwordPlaceholder')}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('clubs.form.passwordDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clubs.form.confirmPassword')} *</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder={t('clubs.form.confirmPasswordPlaceholder')}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('clubs.form.confirmPasswordDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='flex justify-end gap-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => form.reset()}
                disabled={isLoading}
              >
                {t('clubs.form.reset')}
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    {t('clubs.form.creating')}
                  </>
                ) : (
                  t('clubs.form.createButton')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
