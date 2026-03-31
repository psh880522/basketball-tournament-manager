import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import GlobalHeader from "@/components/nav/GlobalHeader";
import Sidebar from "@/components/layout/Sidebar";
import { getUserWithRole } from "@/src/lib/auth/roles";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Basketball Tournament Manager",
  description: "Tournament operations workspace",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userResult = await getUserWithRole();
  const isLoggedIn = userResult.status === "ready";

  return (
    <html lang="en">
      <body className={`${spaceGrotesk.className} antialiased`}>
        {isLoggedIn ? (
          <div className="flex h-screen overflow-hidden">
            <Sidebar
              role={userResult.role}
              userEmail={userResult.user?.email ?? null}
            />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        ) : (
          <>
            <GlobalHeader />
            {children}
          </>
        )}
      </body>
    </html>
  );
}
