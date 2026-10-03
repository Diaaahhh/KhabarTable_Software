import Sidebar from "@/src/components/sidebar/Sidebar";
import { checkPermission } from "../../../lib/auth/authorization";
import AssignPackage from "@/src/components/Package/AssignPackage";

export default async function CreatePackagePage() {
  await checkPermission("/company/package/assign_package");
  return (
    <div>
      <Sidebar />

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <AssignPackage />
      </main>
    </div>
  );
}
