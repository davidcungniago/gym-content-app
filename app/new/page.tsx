'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient' // Pastikan path ini sesuai
import { useRouter } from 'next/navigation'

export default function NewPost() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Default hari ini
    muscle: '',
    topic: '',
    script: '',
    equipment: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Kirim data ke Supabase
    const { error } = await supabase.from('content_schedule').insert([
      {
        schedule_date: formData.date,
        muscle_group: formData.muscle,
        topic: formData.topic,
        script_draft: formData.script,
        equipment_needed: formData.equipment,
        status: 'Planned'
      }
    ])

    if (error) {
      alert('Gagal simpan: ' + error.message)
      setLoading(false)
    } else {
      // Jika sukses, kembali ke dashboard
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-yellow-400">📝 Tambah Jadwal</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Tanggal */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tanggal Latihan</label>
            <input 
              type="date" 
              className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 text-white"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>

          {/* Muscle Group */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Muscle Group</label>
            <select 
              className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 text-white"
              value={formData.muscle}
              onChange={(e) => setFormData({...formData, muscle: e.target.value})}
              required
            >
              <option value="">Pilih Otot...</option>
              <option value="Chest">Chest (Dada)</option>
              <option value="Back">Back (Punggung)</option>
              <option value="Legs">Legs (Kaki)</option>
              <option value="Shoulders">Shoulders (Bahu)</option>
              <option value="Arms">Arms (Tangan)</option>
              <option value="Cardio">Cardio / Abs</option>
            </select>
          </div>

          {/* Topik Konten */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Judul / Topik Konten</label>
            <input 
              type="text" 
              placeholder="Contoh: Tips Bench Press Biar Ga Sakit Bahu"
              className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 text-white placeholder-gray-600"
              value={formData.topic}
              onChange={(e) => setFormData({...formData, topic: e.target.value})}
              required
            />
          </div>

          {/* Script / Catatan */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Ide Script / Caption</label>
            <textarea 
              rows={4}
              placeholder="Hook: Pernah gak sih kalian ngerasain..."
              className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 text-white placeholder-gray-600"
              value={formData.script}
              onChange={(e) => setFormData({...formData, script: e.target.value})}
            />
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Alat Pendukung (Opsional)</label>
            <input 
              type="text" 
              placeholder="Tripod, Mic, Belt..."
              className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 text-white placeholder-gray-600"
              value={formData.equipment}
              onChange={(e) => setFormData({...formData, equipment: e.target.value})}
            />
          </div>

          <button 
            disabled={loading}
            type="submit" 
            className="w-full bg-yellow-400 text-black font-bold p-4 rounded-xl mt-6 hover:bg-yellow-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'SIMPAN JADWAL ✅'}
          </button>

          <button 
            type="button"
            onClick={() => router.back()}
            className="w-full text-gray-500 text-sm mt-2 hover:text-white"
          >
            Batal
          </button>
        </form>
      </div>
    </main>
  )
}