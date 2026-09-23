import Sidebar from "../components/sidebar/Sidebar";

export default function Home() {
  return (
    <div>
      <Sidebar/>

      <main className="ml-64 min-h-screen bg-gray-100 p-8">
        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          This is the main content area.
        </p>
      </main>
    </div>
  );
}