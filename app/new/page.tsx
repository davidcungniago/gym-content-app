'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function Home() {
  const [schedules, setSchedules] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('content_schedule')
        .select('*')
        .order('schedule_date', { ascending: true })
      
      if (error) console.log('Error:', error)
      else setSchedules(data || [])
    }
    fetchData()
  }, [])

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 pb-24 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-yellow-400 tracking-tight">GYM CONTENT 🚀</h1>
          <p className="text-gray-400 text-xs mt-1">Manage your gains & content.</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
          {/* DI SINI PERUBAHANNYA: Angka otomatis */}
          <h2 className="text-3xl font-bold text-white">{schedules.length}</h2>
          <p className="text-gray-400 text-xs mt-1">Ideas Drafted</p>
        </div>
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg opacity-50">
          <h2 className="text-3xl font-bold text-white">0</h2>
          <p className="text-gray-400 text-xs mt-1">PR Broken</p>
        </div>
      </div>

      {/* List Jadwal */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          🗓️ Jadwal Konten
        </h2>

        {schedules.length === 0 ? (
           <div className="text-center p-8 bg-gray-800 rounded-xl border border-dashed border-gray-600">
             <p className="text-gray-400">Belum ada jadwal.</p>
             <p className="text-xs text-gray-500 mt-1">Tambahkan lewat tombol di bawah.</p>
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
      </div>

      {/* Tombol Add New (+ NEW) */}
      <Link href="/new">
        <button className="fixed bottom-6 right-6 bg-yellow-400 text-black w-auto px-6 h-14 rounded-full shadow-xl font-bold text-lg flex items-center justify-center hover:bg-yellow-300 transition-all z-50 gap-2">
          <span>+ NEW</span>
        </button>
      </Link>
    </main>
  )
}