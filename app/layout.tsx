import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: {
    default: "Strelitzia",
    template: "%s | Strelitzia",
  },
  description: "Application professionnelle de gestion scolaire",
  keywords: [
    "strelitzia",
    "gestion scolaire",
    "ecole",
    "etudiants",
    "academique",
    "nextjs",
  ],
  authors: [
    {
      name: "Aina Misaela",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className="h-full scroll-smooth"
    >
      <body
        className="
          min-h-screen
          bg-slate-50
          text-slate-900
          antialiased
          flex
          flex-col
        "
      >
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}