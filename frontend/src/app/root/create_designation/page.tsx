import Sidebar from "@/src/components/sidebar/Sidebar";
import { checkPermission } from "../../lib/auth/authorization";
import CompanyList from "@/src/components/root/CompanyList";
import AddViewDesignation from "@/src/components/Designation/AddViewDesignation";

export default async function AddViewDesignationPage() {
  await checkPermission("/root/create_designation");
  return (
    <div>
      <Sidebar />

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <AddViewDesignation/>
      </main>
    </div>
  );
}
 