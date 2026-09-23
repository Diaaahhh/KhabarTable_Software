import Sidebar from "@/src/components/sidebar/Sidebar";
import CreateVarientandPrice from "@/src/components/company/CreateVarientandPrice";
import { checkPermission } from "../../lib/auth/authorization";

export default async function CreateVarientandPricePage() {
    await checkPermission("/company/create_variant");
return (
    <div>
      <Sidebar/>

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <CreateVarientandPrice />
      </main>
    </div>
  );
}