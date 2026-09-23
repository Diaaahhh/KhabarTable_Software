import Sidebar from "@/src/components/sidebar/Sidebar";
import { checkPermission } from "../../lib/auth/authorization";
import CreateIngredients from "@/src/components/root/CreateIngredients";

export default async function CreateIngredientsPage() {
  await checkPermission("/root/menu_ingredient");
  return (
    <div>
      <Sidebar />

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <CreateIngredients />
      </main>
    </div>
  );
}
