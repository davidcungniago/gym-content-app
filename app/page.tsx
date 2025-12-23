'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fungsi untuk mengambil data jadwal dari Supabase
  useEffect(() => {
    const fetchSchedules = async () => {
      // Ambil data dari tabel 'content_schedule'
      const { data, error } = await supabase
        .from('content_schedule')
        .select('*')
        .order('schedule_date', { ascending: true })

      if (error) console.log('Error:', error)
      else setSchedules(data || [])
      setLoading(false)
    }

    fetchSchedules()
  }, [])

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-yellow-400">GYM CONTENT 🚀</h1>
        <p className="text-gray-400 text-sm mt-2">Manage your gains & content.</p>
      </header>

      {/* Quick Stats / Menu */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-center">
          <h2 className="text-2xl font-bold">0</h2>
          <p className="text-xs text-gray-400">Ideas Drafted</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-center">
          <h2 className="text-2xl font-bold">0</h2>
          <p className="text-xs text-gray-400">PR Broken</p>
        </div>
      </div>

      {/* Bagian Jadwal */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          📅 Jadwal Konten
        </h2>

        {loading ? (
          <p className="text-center text-gray-500 animate-pulse">Loading data...</p>
        ) : schedules.length === 0 ? (
          <div className="text-center p-8 bg-gray-800 rounded-xl border border-dashed border-gray-600">
            <p className="text-gray-400">Belum ada jadwal.</p>
            <p className="text-xs text-gray-500 mt-1">Tambahkan lewat database dulu.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map((item) => (
              <div key={item.id} className="bg-gray-800 p-4 rounded-xl border-l-4 border-yellow-400 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded text-yellow-300">
                    {item.schedule_date}
                  </span>
                  <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded-full">
                    {item.muscle_group}
                  </span>
                </div>
                <h3 className="font-bold text-lg leading-tight">{item.topic}</h3>
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                  {item.script_draft || 'Belum ada script...'}
                </p>
                <div className="mt-3 text-xs text-gray-500 flex gap-2">
                  {item.equipment_needed && <span>🎥 {item.equipment_needed}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Floating Action Button (Tombol Tambah) */}
      <button className="fixed bottom-6 right-6 bg-yellow-400 text-black p-4 rounded-full shadow-xl font-bold hover:bg-yellow-300 transition-all">
        + NEW
      </button>
    </main>
  )
}