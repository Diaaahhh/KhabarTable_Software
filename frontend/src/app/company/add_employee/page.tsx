import AddEmployee from "@/src/components/Employee/AddEmployee";
import Sidebar from "@/src/components/sidebar/Sidebar";
import { checkPermission } from "../../lib/auth/authorization";
checkPermission
export default async function AddEmployeePage() {
  await checkPermission("/company/add_employee");
  return (
    <div>
      <Sidebar/>

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <AddEmployee/>
      </main>
    </div>
  );
}