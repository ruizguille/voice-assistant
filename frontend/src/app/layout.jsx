import { Open_Sans, Urbanist } from 'next/font/google';
import Script from 'next/script';
import './index.css';

export const metadata = {
  title: 'AI Voice Assistant'
};

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
});

const urbanist = Urbanist({
  subsets: ['latin'],
  variable: '--font-urbanist',
});

export default function RootLayout({ children }) {
  return (
    <html lang='en' className={`${openSans.variable} ${urbanist.variable}`}>
      <head>
        {(process.env.NODE_ENV === 'production') && (
          <Script
            src='https://cloud.umami.is/script.js'
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
