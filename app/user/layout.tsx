import Sidebar from "@/components/Sidebar";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}