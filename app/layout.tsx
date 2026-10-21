import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeSynchronizer from '@/components/ThemeSynchronizer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PixelCraft — Sistema de Gestão',
  description: 'Sistema de gerenciamento para agência audiovisual e criativa',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;

                  // 1. Theme sync
                  var theme = localStorage.getItem('agency_app_theme') || 'system';
                  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    root.classList.add('dark');
                    root.classList.remove('light');
                    root.style.colorScheme = 'dark';
                  } else {
                    root.classList.remove('dark');
                    root.classList.add('light');
                    root.style.colorScheme = 'light';
                  }

                  // 2. Font Size sync
                  var fontSize = localStorage.getItem('agency_app_font_size') || 'medium';
                  root.setAttribute('data-font-size', fontSize);
                  if (fontSize === 'small') {
                    root.style.fontSize = '14px';
                  } else if (fontSize === 'large') {
                    root.style.fontSize = '18px';
                  } else {
                    root.style.fontSize = '16px';
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeSynchronizer />
        {children}
      </body>
    </html>
  );
}
