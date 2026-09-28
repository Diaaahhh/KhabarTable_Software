import Sidebar from "@/src/components/sidebar/Sidebar";
import { checkPermission } from "../../lib/auth/authorization";
import CompanyList from "@/src/components/root/CompanyList";

export default async function CompanyListPage() {
  await checkPermission("/root/list");
  return (
    <div>
      <Sidebar />

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <CompanyList />
      </main>
    </div>
  );
}
 