import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, useRouter } from '@tanstack/react-router'
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

const createClubFormSchema = z.object({
  // Club Info
  clubName: z
    .string()
    .min(2, 'Club name must be at least 2 characters')
    .max(100, 'Club name must be less than 100 characters'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters'),
  logoUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),

  // Admin User Info
  adminName: z
    .string()
    .min(2, 'Admin name must be at least 2 characters')
    .max(100, 'Admin name must be less than 100 characters'),
  adminEmail: z
    .string()
    .email('Must be a valid email address'),
  adminPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type CreateClubFormValues = z.infer<typeof createClubFormSchema>

// ============================================
// Component
// ============================================

export function CreateClubForm() {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const router = useRouter()

  const form = useForm<CreateClubFormValues>({
    resolver: zodResolver(createClubFormSchema),
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
        toast.success('Club created successfully!', {
          description: `Club "${values.clubName}" has been created with admin ${values.adminEmail}`,
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
        toast.error('Failed to create club', {
          description: response.error || 'An unknown error occurred',
        })
      }
    } catch (error) {
      toast.error('Failed to create club', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className='mx-auto max-w-2xl'>
      <CardHeader>
        <CardTitle>Create New Club</CardTitle>
        <CardDescription>
          Set up a new club with an admin user in your multi-tenant system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Club Information Section */}
            <div className='space-y-4'>
              <div>
                <h3 className='text-lg font-medium'>Club Information</h3>
                <p className='text-sm text-muted-foreground'>
                  Basic information about the sports club
                </p>
              </div>

              <FormField
                control={form.control}
                name='clubName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='FC Barcelona'
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      The official name of the sports club
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
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Barcelona'
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      The city where the club is located
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
                    <FormLabel>Logo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='https://example.com/logo.png'
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      URL to the club's logo image
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
                <h3 className='text-lg font-medium'>Admin User</h3>
                <p className='text-sm text-muted-foreground'>
                  Create the primary administrator account for this club
                </p>
              </div>

              <FormField
                control={form.control}
                name='adminName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='John Doe'
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Full name of the club administrator
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
                    <FormLabel>Admin Email *</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='admin@fcbarcelona.com'
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Email address for the admin account
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
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder='••••••••'
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters with uppercase, lowercase,
                      and numbers
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
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder='••••••••'
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Re-enter the password to confirm
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
                Reset
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Creating Club...
                  </>
                ) : (
                  'Create Club'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
