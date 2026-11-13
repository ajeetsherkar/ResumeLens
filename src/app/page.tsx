import { connection } from "next/server";

import Dashboard from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/lib/data/dashboard";

export const instant = false;

export default async function Home() {
  await connection();

  const data = await getDashboardData();

  return <Dashboard data={data} />;
}
