import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motorhome Dashboard",
  description: "Advanced iPad management system for your Motorhome",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Motorhome",
  },
};

export const viewport: Viewport = {
  themeColor: "#f2f2f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on inputs in iOS
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
