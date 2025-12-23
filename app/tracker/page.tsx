'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TrackerPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', weight: '', reps: '' })
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    const { data } = await supabase.from('weight_logs').select('*').order('created_at', { ascending: false })
    if (data) setLogs(data)
  }

  useEffect(() => { fetchLogs() }, [])

  const handleSave = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('weight_logs').insert([{
      exercise_name: form.name,
      weight_kg: parseFloat(form.weight),
      reps: parseInt(form.reps)
    }])
    if (!error) {
      setForm({ name: '', weight: '', reps: '' })
      fetchLogs()
    }
    setLoading(false)
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">🏋️ Weight Tracker</h1>

      {/* Form Input Cepat */}
      <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 mb-8">
        <h2 className="text-lg font-bold mb-4 text-yellow-400">Catat Set Baru</h2>
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input 
            placeholder="Gerakan (Ex: Bench Press)" 
            className="bg-gray-900 text-white p-3 rounded-lg border border-gray-600"
            value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
          />
          <input 
            type="number" placeholder="Berat (KG)" 
            className="bg-gray-900 text-white p-3 rounded-lg border border-gray-600"
            value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} required
          />
          <input 
            type="number" placeholder="Reps" 
            className="bg-gray-900 text-white p-3 rounded-lg border border-gray-600"
            value={form.reps} onChange={e => setForm({...form, reps: e.target.value})} required
          />
          <button disabled={loading} className="bg-yellow-400 text-black font-bold p-3 rounded-lg hover:bg-yellow-300">
            {loading ? 'Menyimpan...' : 'TAMBAH +'}
          </button>
        </form>
      </div>

      {/* List History */}
      <div className="space-y-3">
        {logs.map(log => (
          <div key={log.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
            <div>
              <p className="font-bold text-lg text-white">{log.exercise_name}</p>
              <p className="text-xs text-gray-500">{log.date}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-yellow-400">{log.weight_kg} <span className="text-sm text-gray-500">kg</span></span>
              <span className="text-gray-400 mx-2">x</span>
              <span className="text-xl font-bold text-white">{log.reps} <span className="text-sm text-gray-500">reps</span></span>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}