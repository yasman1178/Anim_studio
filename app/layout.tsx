import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anime Dub Studio - محب أنمي',
  description: 'استوديو دبلجة الأنمي الاحترافي باللهجة المصرية لقناة «محب أنمي»، مع فصل مجاني للصوت والموسيقى وتوليد أصوات Edge-TTS ومحرر خط زمني متكامل.',
  openGraph: {
    title: 'Anime Dub Studio - محب أنمي',
    description: 'استوديو دبلجة الأنمي الاحترافي باللهجة المصرية لقناة «محب أنمي»، مع فصل مجاني للصوت والموسيقى وتوليد أصوات Edge-TTS ومحرر خط زمني متكامل.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anime Dub Studio - محب أنمي',
    description: 'استوديو دبلجة الأنمي الاحترافي باللهجة المصرية لقناة «محب أنمي»، مع فصل مجاني للصوت والموسيقى وتوليد أصوات Edge-TTS ومحرر خط زمني متكامل.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="bg-[#0B0F19] text-slate-100 antialiased selection:bg-rose-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
