import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PageMind AI",
  description: "Turn textbook pages into structured visual intelligence."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
