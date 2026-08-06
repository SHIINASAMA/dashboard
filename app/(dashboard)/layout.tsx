import { Outlet } from "react-router";
import Layout from "@/components/Layout";
import { MockModeBanner } from "@/components/MockModeBanner";

export default function DashboardLayout() {
  return (
    <Layout>
      <Outlet />
      <MockModeBanner />
    </Layout>
  );
}
