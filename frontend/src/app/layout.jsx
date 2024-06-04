import { Open_Sans } from 'next/font/google';
import './index.css';

export const metadata = {
  title: 'Voice assistant'
};

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
});

export default function RootLayout({ children }) {
  return (
    <html lang='en' className={openSans.variable}>
      <body>{children}</body>
    </html>
  );
}
