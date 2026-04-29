import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motorhome",
  description: "Cuaderno digital para gestionar rutas, mantenimiento, combustible y registro diario de tu autocaravana.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Motorhome",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAFA",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body suppressHydrationWarning className="antialiased">
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
