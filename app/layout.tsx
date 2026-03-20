import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import GlobalHeader from "@/components/nav/GlobalHeader";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
      <body className={`${spaceGrotesk.className} antialiased`}>
        <GlobalHeader />
        {children}
      </body>
    </html>
  );
}
