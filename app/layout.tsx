export const metadata = {
  title: "Dashboard",
  description: "Multi-platform social & code dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
