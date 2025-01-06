import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'react-hot-toast';
import { Providers } from '@/app/providers';

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Fractalgram</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Arvo&family=Roboto:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
