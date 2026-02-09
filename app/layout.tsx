import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Basketball Tournament Manager",
  description: "Tournament operations workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
