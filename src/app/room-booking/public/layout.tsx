// src/app/room-booking/public/layout.tsx
export default function PublicRoomBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Anti-Corruption Commission
            </h1>
            <p className="text-xs text-gray-500">Phuntsholing Regional Office</p>
          </div>
          <a
            href="https://app.acc.org.bt"
            className="text-xs text-blue-600 hover:underline"
          >
            app.acc.org.bt →
          </a>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6">{children}</main>
      <footer className="py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Anti-Corruption Commission
      </footer>
    </div>
  );
}