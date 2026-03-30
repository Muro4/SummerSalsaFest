import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'bg'],
  defaultLocale: 'en'
});

// This creates localized versions of Next.js navigation components
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);