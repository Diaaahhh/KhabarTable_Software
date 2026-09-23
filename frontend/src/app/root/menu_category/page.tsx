import Sidebar from "@/src/components/sidebar/Sidebar";
import CreateMenuCategory from "@/src/components/root/CreateMenuCategory";
import { checkPermission } from "../../lib/auth/authorization";

export default async function CreateMenuCategoryPage() {
  await checkPermission("/root/menu_category");
  return (
    <div>
      <Sidebar />

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <CreateMenuCategory />
      </main>
    </div>
  );
}
