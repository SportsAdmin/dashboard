import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function MaintenanceError() {
  const { t } = useTranslation()
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>{t('errors.maintenance.code')}</h1>
        <span className='font-medium'>{t('errors.maintenance.title')}</span>
        <p className='text-center text-muted-foreground'>
          {t('errors.maintenance.description')}
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline'>{t('errors.maintenance.goBack')}</Button>
        </div>
      </div>
    </div>
  )
}
