import { Open_Sans, Urbanist } from 'next/font/google';
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
      <body>{children}</body>
    </html>
  );
}
