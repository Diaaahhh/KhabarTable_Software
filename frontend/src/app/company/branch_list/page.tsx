import BranchList from "@/src/components/company/BranchList";
import Sidebar from "@/src/components/sidebar/Sidebar";
import { checkPermission } from "../../lib/auth/authorization";

export default async function BranchListPage() {
  await checkPermission("/company/branch_list");
  return (
    <div>
      <Sidebar />

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <BranchList />
      </main>
    </div>
  );
}
