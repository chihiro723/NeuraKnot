import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { SEO_CONFIG, STRUCTURED_DATA } from "@/lib/constants/seo";

// アプリケーション全体のメタデータ設定
export const metadata: Metadata = {
  metadataBase: new URL(SEO_CONFIG.url),
  title: {
    default: SEO_CONFIG.title.default,
    template: SEO_CONFIG.title.template,
  },
  description: SEO_CONFIG.description.default,
  keywords: SEO_CONFIG.keywords,
  authors: [{ name: "NeuraKnot Team" }],
  creator: "NeuraKnot Team",
  publisher: "NeuraKnot",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: SEO_CONFIG.title.default,
    description: SEO_CONFIG.description.default,
    url: SEO_CONFIG.url,
    siteName: SEO_CONFIG.siteName,
    images: [
      {
        url: SEO_CONFIG.ogImage,
        width: 1200,
        height: 630,
        alt: "NeuraKnot",
      },
    ],
    locale: SEO_CONFIG.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_CONFIG.title.default,
    description: SEO_CONFIG.description.short,
    creator: SEO_CONFIG.twitterHandle,
    images: [SEO_CONFIG.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: SEO_CONFIG.themeColor,
      },
    ],
  },
  manifest: SEO_CONFIG.manifest,
};

/**
 * アプリケーション全体のルートレイアウト
 * すべてのページで共有されるHTML構造を定義
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <meta name="theme-color" content={SEO_CONFIG.themeColor} />
        <meta name="msapplication-TileColor" content={SEO_CONFIG.themeColor} />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="RSS Feed"
          href="/rss.xml"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        {/* テーマフラッシュ防止スクリプト */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
