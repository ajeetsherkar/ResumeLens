import Dashboard from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/lib/data/dashboard";

export const instant = false;

export default function Home() {
  const data = getDashboardData();
  return <Dashboard data={data} />;
}
