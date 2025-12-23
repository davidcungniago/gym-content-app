'use client'
import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Jangan tampilkan sidebar di halaman Login
  if (pathname === '/login') {
    return (
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    )
  }

  const menuItems = [
    { name: '📅 Kalender', path: '/' },
    { name: '📷 Gallery Body', path: '/gallery' },
    { name: '🏋️ Weight Tracker', path: '/tracker' },
  ]

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white flex`}>
        
        {/* MOBILE OVERLAY (Buat nutup sidebar kalau diklik luar) */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <h1 className="text-2xl font-extrabold text-yellow-400 italic">GYM APP ⚡</h1>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400">✕</button>
          </div>
          
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                onClick={() => setIsSidebarOpen(false)} // Tutup sidebar pas klik menu (di HP)
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  pathname === item.path 
                    ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center">Keep Grinding! 💪</p>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-h-screen relative">
          
          {/* HEADER MOBILE (Tombol Hamburger) */}
          <div className="lg:hidden p-4 border-b border-gray-800 bg-gray-950 flex items-center gap-3 sticky top-0 z-30">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg bg-gray-800 text-white"
            >
              ☰
            </button>
            <span className="font-bold text-yellow-400">Menu</span>
          </div>

          {/* Isi Halaman */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>

      </body>
    </html>
  )
}