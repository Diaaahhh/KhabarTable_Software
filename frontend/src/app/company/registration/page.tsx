import Sidebar from "@/src/components/sidebar/Sidebar";
import BranchRegistration from "../../../components/company/BranchRegistration";
import { checkPermission } from "../../lib/auth/authorization";

export default async function BranchRegistrationPage() {
    await checkPermission("/company/registration");
return (
    <div>
      <Sidebar/>

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <BranchRegistration />
      </main>
    </div>
  );
}