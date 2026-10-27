import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduVerse 3D AI Academy",
  description: "Gamified 3D learning for Mathematics, Chemistry, Physics and Biology.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
