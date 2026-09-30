import Sidebar from "@/src/components/sidebar/Sidebar";
import { checkPermission } from "../../lib/auth/authorization";
import EmployeeList from "@/src/components/Employee/EmployeeList";

export default async function EmployeeListPage() {
  await checkPermission("/company/employee_list");
  return (
    <div>
      <Sidebar />

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <EmployeeList />
      </main>
    </div>
  );
}
