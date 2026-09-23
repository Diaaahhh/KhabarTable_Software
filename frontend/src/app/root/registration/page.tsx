import Sidebar from "@/src/components/sidebar/Sidebar";
import CompanyRegistration from "../../../components/root/CompanyRegistration";
import { checkPermission } from "../../lib/auth/authorization";

export default async function CompanyRegistrationPage() {
  await checkPermission("/root/registration");
  return (
    <div>
      <Sidebar />

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <CompanyRegistration />
      </main>
    </div>
  );
}
