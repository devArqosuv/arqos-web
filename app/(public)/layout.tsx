import { Playfair_Display, Montserrat } from 'next/font/google';
import { Navbar } from '@/app/components/layout/Navbar';
import { Footer } from '@/app/components/layout/Footer';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${playfair.variable} ${montserrat.variable}`}>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
