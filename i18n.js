import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

const locales = ['en', 'bg'];

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the new requestLocale promise
  const locale = await requestLocale;

  // Validate that the incoming locale parameter is valid
  if (!locale || !locales.includes(locale)) notFound();

  return {
    locale, // <--- THE FIX: explicitly return the resolved locale here
    messages: (await import(`./messages/${locale}.json`)).default
  };
});