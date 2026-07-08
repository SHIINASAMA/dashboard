import "./globals.css";
import "@/lib/startup";
import { Providers } from "./providers";

export const metadata = {
  title: "Dashboard",
  description: "Multi-platform social & code dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
