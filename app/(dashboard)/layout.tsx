"use client";

import Layout from "@/components/Layout";
import { MockModeBanner } from "@/components/MockModeBanner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      {children}
      <MockModeBanner />
    </Layout>
  );
}
