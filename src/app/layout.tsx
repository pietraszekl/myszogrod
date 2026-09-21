import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Myszogród",
  description: "Map-first system wspólnej oceny nieruchomości.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
