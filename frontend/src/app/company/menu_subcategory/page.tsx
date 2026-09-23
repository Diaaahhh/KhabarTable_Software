import Sidebar from "@/src/components/sidebar/Sidebar";
import CreateSubMenu from "@/src/components/root/CreateSubMenu";
import { checkPermission } from "../../lib/auth/authorization";

export default async function CreateSubMenuPage() {
  await checkPermission("/company/menu_subcategory");
  return (
    <div>
      <Sidebar />

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <CreateSubMenu />
      </main>
    </div>
  );
}
