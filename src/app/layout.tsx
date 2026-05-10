import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Clawshboard", description: "Mission control" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="scrollbar">{children}</body></html>;
}