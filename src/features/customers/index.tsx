import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Button } from '@/components/ui/button'
import { CustomersTable } from './components/customers-table'
import { AddCustomerDialog } from './components/add-customer-dialog'
import { customers } from './data/customers'
import { type CustomerFormData, type Customer } from './data/schema'
import i18n from '@/lib/i18n'

export function Customers() {
  const [customersList, setCustomersList] = useState<Customer[]>(customers)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleAddCustomer = (data: CustomerFormData) => {
    const newCustomer: Customer = {
      id: String(Date.now()),
      name: data.name,
      phone: data.phone,
      email: data.email,
      createdAt: new Date().toISOString(),
    }

    setCustomersList((prev) => [newCustomer, ...prev])
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitcher />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>{i18n.t('customers.title')}</h2>
            <p className='text-muted-foreground'>
              {i18n.t('customers.description')}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <UserPlus className='mr-2 size-4' />
            {i18n.t('customers.addCustomer')}
          </Button>
        </div>
        <CustomersTable data={customersList} />
      </Main>

      <AddCustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAddCustomer}
      />
    </>
  )
}
