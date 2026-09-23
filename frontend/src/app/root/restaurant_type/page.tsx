import Sidebar from "@/src/components/sidebar/Sidebar";
import CreateRestaurantType from "@/src/components/root/CreateRestaurantType";
import { checkPermission } from "../../lib/auth/authorization";

export default async function CreateRestaurantTypePage() {
  await checkPermission("/root/restaurant_type");
  return (
    <div>
      <Sidebar />

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <CreateRestaurantType />
      </main>
    </div>
  );
}
