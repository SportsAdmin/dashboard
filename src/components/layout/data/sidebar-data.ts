import {
  Construction,
  LayoutDashboard,
  Monitor,
  Bug,
  ListTodo,
  FileX,
  HelpCircle,
  Lock,
  Bell,
  Package,
  Palette,
  ServerOff,
  Settings,
  Wrench,
  UserCog,
  UserX,
  Users,
  MessagesSquare,
  ShieldCheck,
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
  ShoppingCart,
  PackageSearch,
  Package2,
  UserCircle,
  Building2,
  ClipboardList,
} from 'lucide-react'
import i18n from '@/lib/i18n'
import { ClerkLogo } from '@/assets/clerk-logo'
import { type SidebarData } from '../types'

export const getSidebarData = (): SidebarData => ({
  user: {
    name: 'satnaing',
    email: 'satnaingdev@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Shadcn Admin',
      logo: Command,
      plan: 'Vite + ShadcnUI',
    },
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: i18n.t('nav.dashboard'),
          url: '/',
          icon: LayoutDashboard,
        },
        // {
        //   title: i18n.t('nav.pos'),
        //   url: '/pos',
        //   icon: ShoppingCart,
        // },
        {
          title: i18n.t('nav.inventory'),
          url: '/inventory',
          icon: PackageSearch,
        },
        {
          title: i18n.t('nav.products'),
          url: '/products',
          icon: Package2,
        },
        {
          title: i18n.t('purchaseOrders.title'),
          url: '/purchase-orders',
          icon: ClipboardList,
        },
        {
          title: i18n.t('nav.customers'),
          url: '/customers',
          icon: UserCircle,
        },
        {
          title: i18n.t('nav.tasks'),
          url: '/tasks',
          icon: ListTodo,
          roles: ['admin'],
        },
        {
          title: i18n.t('nav.apps'),
          url: '/apps',
          icon: Package,
          roles: ['admin'],
        },
        {
          title: i18n.t('nav.chats'),
          url: '/chats',
          badge: '3',
          icon: MessagesSquare,
          roles: ['admin'],
        },
        {
          title: i18n.t('nav.users'),
          url: '/users',
          icon: Users,
          roles: ['admin', 'manager'],
        },
        {
          title: 'Clubes',
          icon: Building2,
          url: '/clubs',
          roles: ['admin'],
        },
        // {
        //   title: 'Secured by Clerk',
        //   icon: ClerkLogo,
        //   items: [
        //     {
        //       title: 'Sign In',
        //       url: '/clerk/sign-in',
        //     },
        //     {
        //       title: 'Sign Up',
        //       url: '/clerk/sign-up',
        //     },
        //     {
        //       title: 'User Management',
        //       url: '/clerk/user-management',
        //     },
        //   ],
        // },
      ],
    },
    // {
    //   title: 'Pages',
    //   items: [
    //     {
    //       title: 'Auth',
    //       icon: ShieldCheck,
    //       items: [
    //         {
    //           title: 'Sign In',
    //           url: '/sign-in',
    //         },
    //         {
    //           title: 'Sign In (2 Col)',
    //           url: '/sign-in-2',
    //         },
    //         {
    //           title: 'Sign Up',
    //           url: '/sign-up',
    //         },
    //         {
    //           title: 'Forgot Password',
    //           url: '/forgot-password',
    //         },
    //         {
    //           title: 'OTP',
    //           url: '/otp',
    //         },
    //       ],
    //     },
    //     {
    //       title: 'Errors',
    //       icon: Bug,
    //       items: [
    //         {
    //           title: 'Unauthorized',
    //           url: '/errors/unauthorized',
    //           icon: Lock,
    //         },
    //         {
    //           title: 'Forbidden',
    //           url: '/errors/forbidden',
    //           icon: UserX,
    //         },
    //         {
    //           title: 'Not Found',
    //           url: '/errors/not-found',
    //           icon: FileX,
    //         },
    //         {
    //           title: 'Internal Server Error',
    //           url: '/errors/internal-server-error',
    //           icon: ServerOff,
    //         },
    //         {
    //           title: 'Maintenance Error',
    //           url: '/errors/maintenance-error',
    //           icon: Construction,
    //         },
    //       ],
    //     },
    //   ],
    // },
    // {
    //   title: 'Otros',
    //   items: [
    //     // {
    //     //   title: 'Settings',
    //     //   icon: Settings,
    //     //   items: [
    //     //     {
    //     //       title: 'Profile',
    //     //       url: '/settings',
    //     //       icon: UserCog,
    //     //     },
    //     //     {
    //     //       title: 'Account',
    //     //       url: '/settings/account',
    //     //       icon: Wrench,
    //     //     },
    //     //     {
    //     //       title: 'Appearance',
    //     //       url: '/settings/appearance',
    //     //       icon: Palette,
    //     //     },
    //     //     {
    //     //       title: 'Notifications',
    //     //       url: '/settings/notifications',
    //     //       icon: Bell,
    //     //     },
    //     //     {
    //     //       title: 'Display',
    //     //       url: '/settings/display',
    //     //       icon: Monitor,
    //     //     },
    //     //   ],
    //     // },
    //     {
    //       title: i18n.t('nav.helpCenter'),
    //       url: '/help-center',
    //       icon: HelpCircle,
    //     },
    //   ],
    // },
  ],
})
