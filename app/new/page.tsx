'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Daftar Otot yang tersedia
const MUSCLE_OPTIONS = [
  'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Cardio / Abs'
]

export default function NewSchedulePage() {
  const router = useRouter()
  const [date, setDate] = useState('')
  // Sekarang bentuknya Array string [], bukan string biasa
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]) 
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Set default tanggal hari ini
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
  }, [])

  const toggleMuscle = (muscle: string) => {
    if (selectedMuscles.includes(muscle)) {
      // Kalau sudah ada, hapus (unselect)
      setSelectedMuscles(selectedMuscles.filter(m => m !== muscle))
    } else {
      // Kalau belum ada, tambahkan
      setSelectedMuscles([...selectedMuscles, muscle])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || selectedMuscles.length === 0) {
      alert("Pilih tanggal dan minimal 1 target otot!")
      return
    }
    
    setLoading(true)

    // KITA GABUNGKAN ARRAY JADI STRING JSON
    // Contoh: ["Chest", "Triceps"] disimpan sebagai '["Chest","Triceps"]'
    // Ini trik supaya tidak perlu ubah struktur database Supabase kamu.
    const muscleGroupString = JSON.stringify(selectedMuscles)

    const { error } = await supabase.from('content_schedule').insert([
      {
        schedule_date: date,
        muscle_group: muscleGroupString, // Simpan format string JSON
        is_rest: false
      }
    ])

    if (error) {
      console.error(error)
      alert("Gagal menyimpan jadwal")
    } else {
      router.push('/tracker') // Balik ke halaman tracker
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-yellow-500 mb-2">Buat Jadwal Baru</h1>
          <p className="text-gray-400">Target apa yang mau dihajar hari ini?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-6 rounded-2xl border border-gray-800">
          
          {/* Input Tanggal */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-400 uppercase">Tanggal Latihan</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-white focus:border-yellow-500 outline-none"
            />
          </div>

          {/* Multi-Select Muscle Group */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-400 uppercase">
              Target Otot (Bisa pilih banyak)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {MUSCLE_OPTIONS.map((muscle) => {
                const isSelected = selectedMuscles.includes(muscle)
                return (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => toggleMuscle(muscle)}
                    className={`p-3 rounded-xl text-sm font-bold transition-all border ${
                      isSelected 
                        ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20 scale-105' 
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    {muscle} {isSelected && '✓'}
                  </button>
                )
              })}
            </div>
            {selectedMuscles.length > 0 && (
              <p className="text-xs text-yellow-500/80 italic mt-2">
                Terpilih: {selectedMuscles.join(', ')}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-4 rounded-xl text-lg hover:scale-[1.02] transition-transform shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Menyimpan...' : 'SIMPAN JADWAL 🔥'}
          </button>

          <Link href="/tracker" className="block text-center text-gray-500 text-sm hover:text-white">
            Batal, kembali ke kalender
          </Link>
        </form>
      </div>
    </div>
  )
}