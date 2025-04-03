import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/functions/classnames";
import MotionWrapper from "@/components/motion-wrapper";
import ContextWrapper from "@/components/contextWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Wallet Example",
  description: "A smart wallet example using Algorand Smart Contracts & Passkeys",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={cn(inter.className, 'h-full bg-black')}>
      <ContextWrapper>
        <MotionWrapper>
          {children}
        </MotionWrapper>
      </ContextWrapper>
      </body>
    </html>
  );
}
