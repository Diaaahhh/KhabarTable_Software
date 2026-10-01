import Sidebar from "@/src/components/sidebar/Sidebar";
import CreateSubMenu from "@/src/components/root/CreateSubMenu";
import { checkPermission } from "../../../lib/auth/authorization";
import CreatePackage from "@/src/components/Package/CreatePackage";

export default async function CreatePackagePage() {
  await checkPermission("/company/package/create_package");
  return (
    <div>
      <Sidebar />

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <CreatePackage />
      </main>
    </div>
  );
}
