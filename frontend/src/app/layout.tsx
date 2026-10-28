import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mekong · Logistics workspace", template: "%s · Mekong" },
  description:
    "Your company, people and logistics, connected. A logistics workspace for Southeast Asia.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
