import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'אפיון ציוד מכולת חומ"ס — כבאות והצלה',
  description: "HazMat Container Equipment Characterization App",
  manifest: "/manifest.json",
  themeColor: "#C0272D",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
