'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, getDay, isToday 
} from 'date-fns'
import { id } from 'date-fns/locale' 
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

// --- CONFIG OPSI LATIHAN (LENGKAP) ---
// Pastikan nama key di sini SAMA PERSIS dengan opsi di 'app/new/page.tsx'
const EXERCISE_CONFIG: any = {
  'Back': {
    'Row': { types: ['Cable', 'Machine'], grips: ['High', 'Width'], modes: ['Single', 'Double'] },
    'Lat Pulldown': { types: ['Single', 'Bar'], grips: [], modes: [] }, 
    'Rear Delt Fly': { types: ['Machine', 'Cable'], grips: [], modes: ['Single', 'Double'] },
    'Deadlift': { types: ['Conventional', 'Sumo'], grips: [], modes: [] },
    'Pull Up': { types: ['Bodyweight', 'Weighted'], grips: [], modes: [] }
  },
  'Chest': {
    'Incline Press': { types: ['Machine', 'Smith', 'Dumbbell'], grips: [], modes: [] },
    'Chest Fly': { types: ['Machine', 'Cable'], grips: ['High', 'Low'], modes: [] },
    'Bench Press': { types: ['Barbell', 'Dumbbell', 'Smith'], grips: [], modes: [] },
    'Push Up': { types: [], grips: [], modes: [] }
  },
  'Legs': {
    'Squat': { types: ['Hack Squat', 'Free Weight', 'Goblet'], grips: [], modes: [] },
    'Leg Press': { types: [], grips: [], modes: ['Single', 'Double'] },
    'Leg Extension': { types: [], grips: [], modes: ['Single', 'Double'] },
    'Leg Curl': { types: [], grips: [], modes: ['Single', 'Double'] },
    'Calf Raise': { types: ['Standing', 'Seated'], grips: [], modes: [] }
  },
  'Shoulders': {
    'Lateral Raise': { types: ['Machine', 'Cable', 'Free Weight'], grips: [], modes: ['Single', 'Double'] },
    'Shoulder Press': { types: ['Machine', 'Free Weight', 'Smith'], grips: [], modes: [] },
    'Front Raise': { types: ['Dumbbell', 'Cable'], grips: [], modes: [] }
  },
  'Arms': {
    'Bicep Curl': { types: ['Free Weight', 'Cable'], grips: [], modes: ['Single', 'Double'] },
    'Tricep Pushdown': { types: [], grips: [], modes: ['Single', 'Double'] },
    'Preacher Curl': { types: ['Machine', 'Free Weight'], grips: [], modes: [] },
    'Hammer Curl': { types: ['Dumbbell', 'Cable'], grips: [], modes: [] },
    'Skullcrusher': { types: ['Barbell', 'Dumbbell'], grips: [], modes: [] }
  },
  'Cardio / Abs': {
    'Treadmill': { types: [], grips: [], modes: [] },
    'Plank': { types: [], grips: [], modes: [] },
    'Crunches': { types: [], grips: [], modes: [] },
    'Leg Raise': { types: [], grips: [], modes: [] }
  }
}

export default function WeightTrackerPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<any[]>([])
  
  // State Modal & Data
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedData, setSelectedData] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  
  // State Parsing Otot
  const [targetMuscles, setTargetMuscles] = useState<string[]>([])
  const [combinedExercises, setCombinedExercises] = useState<any>({})

  // State Form Input
  const [formMain, setFormMain] = useState('')
  const [formType, setFormType] = useState('')
  const [formGrip, setFormGrip] = useState('')
  const [formMode, setFormMode] = useState('')
  const [formSide, setFormSide] = useState('') 
  const [formWeight, setFormWeight] = useState('')
  const [formReps, setFormReps] = useState('')
  
  const [isLogLoading, setIsLogLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // --- 1. INIT & FETCH ---
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/login')
      else {
        setIsAuthenticated(true)
        fetchSchedules()
      }
    }
    init()
  }, [currentDate])

  const fetchSchedules = async () => {
    const start = startOfMonth(currentDate).toISOString()
    const end = endOfMonth(currentDate).toISOString()
    const { data } = await supabase.from('content_schedule').select('*').gte('schedule_date', start).lte('schedule_date', end)
    if (data) setSchedules(data)
  }

  // --- 2. HANDLE CLICK DATE ---
  const onDateClick = (date: Date) => {
    const data = schedules.find(s => isSameDay(new Date(s.schedule_date), date))
    setSelectedDate(date)
    setSelectedData(data || null)
    
    // Reset Form
    setFormMain(''); setFormType(''); setFormGrip(''); setFormMode(''); setFormSide(''); setFormWeight(''); setFormReps('');

    if (data) {
      // --- LOGIC PARSING MULTIPLE MUSCLES ---
      let parsedMuscles: string[] = []
      
      try {
        // Coba parse kalau formatnya JSON (misal: '["Back","Chest"]')
        if (data.muscle_group.startsWith('[')) {
          parsedMuscles = JSON.parse(data.muscle_group)
        } else {
          // Kalau format lama (cuma string biasa "Back")
          parsedMuscles = [data.muscle_group]
        }
      } catch (e) {
        parsedMuscles = [data.muscle_group]
      }
      
      setTargetMuscles(parsedMuscles)

      // --- LOGIC MENGGABUNGKAN LATIHAN ---
      // Kita loop semua otot yang dipilih, lalu gabungkan semua opsinya jadi satu list besar
      let mergedExercises: any = {}
      parsedMuscles.forEach(muscle => {
        const config = EXERCISE_CONFIG[muscle]
        if (config) {
          mergedExercises = { ...mergedExercises, ...config }
        }
      })
      setCombinedExercises(mergedExercises)

      fetchLogs(data.id)
    } else {
      setLogs([])
      setTargetMuscles([])
      setCombinedExercises({})
    }
  }

  const fetchLogs = async (scheduleId: string) => {
    const { data } = await supabase.from('weight_logs').select('*').eq('schedule_id', scheduleId).order('created_at', { ascending: true })
    if (data) setLogs(data)
    else setLogs([])
  }

  // --- 3. HANDLE ADD LOG ---
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedData) return
    setIsLogLoading(true)

    let details = []
    if (formType) details.push(formType)
    if (formGrip) details.push(formGrip)
    if (formMode) details.push(formMode)
    if ((formMode === 'Single' || formType === 'Single') && formSide) details.push(formSide)

    const fullName = details.length > 0 ? `${formMain} (${details.join(', ')})` : formMain

    const { error } = await supabase.from('weight_logs').insert([{
      schedule_id: selectedData.id,
      exercise_name: fullName,
      weight_kg: parseFloat(formWeight) || 0,
      reps: parseInt(formReps) || 0,
      date: selectedData.schedule_date
    }])

    if (!error) {
      setFormWeight('') 
      // Reps tidak di reset agar cepat kalau set berikutnya sama
      fetchLogs(selectedData.id)
    }
    setIsLogLoading(false)
  }

  const handleDeleteLog = async (id: string) => {
    await supabase.from('weight_logs').delete().eq('id', id)
    if (selectedData) fetchLogs(selectedData.id)
  }

  // --- HELPERS ---
  const exerciseList = Object.keys(combinedExercises).sort() // Urut abjad biar rapi
  const currentExDetail = formMain ? combinedExercises[formMain] : null
  const showSideOption = formMode === 'Single' || formType === 'Single'

  if (!isAuthenticated) return <div className="min-h-screen bg-gray-950"></div>

  return (
    <div className="text-white font-sans p-4 md:p-8 pb-24">
      
      {/* HEADER PAGE */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Weight Tracker 🏋️</h1>
          <p className="text-gray-400 text-sm">Target otot ganda? Bisa!</p>
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="px-3 py-1 hover:bg-gray-700 rounded text-gray-400">◀</button>
          <span className="px-3 py-1 text-sm font-bold w-32 text-center">{format(currentDate, 'MMMM yyyy', { locale: id })}</span>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="px-3 py-1 hover:bg-gray-700 rounded text-gray-400">▶</button>
        </div>
      </div>

      {/* GRID KALENDER */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {['M','S','S','R','K','J','S'].map(d => <div key={d} className="text-center text-gray-500 text-xs font-bold py-2">{d}</div>)}
        
        {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => <div key={`empty-${i}`} />)}
        
        {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((date) => {
          const dayData = schedules.find(s => isSameDay(new Date(s.schedule_date), date))
          return (
            <div key={date.toString()} onClick={() => onDateClick(date)}
              className={cn(
                "aspect-square rounded-xl border flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all relative group",
                dayData ? (dayData.is_rest ? "bg-green-900/20 border-green-800" : "bg-yellow-900/20 border-yellow-700") : "bg-gray-900 border-gray-800 hover:bg-gray-800",
                isToday(date) && "ring-2 ring-white"
              )}
            >
              <span className="text-sm font-bold z-10 group-hover:scale-110 transition-transform">{format(date, 'd')}</span>
              {dayData && !dayData.is_rest && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1"></div>}
            </div>
          )
        })}
      </div>

      {/* MODAL INPUT LATIHAN */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedDate(null)}></div>
          
          <div className="bg-gray-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-gray-800 shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
            
            {/* Header Modal */}
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-3xl sticky top-0 z-20">
              <div>
                <p className="text-gray-400 text-xs">{format(selectedDate, 'EEEE, d MMMM', { locale: id })}</p>
                <h2 className="text-xl font-bold text-white flex gap-2 flex-wrap">
                  {selectedData ? (
                    targetMuscles.map(m => (
                      <span key={m} className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded text-sm border border-yellow-500/30">
                        {m}
                      </span>
                    ))
                  ) : "Kosong"}
                </h2>
              </div>
              <button onClick={() => setSelectedDate(null)} className="bg-gray-800 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white">✕</button>
            </div>

            {/* Isi Modal */}
            <div className="p-5 overflow-y-auto space-y-6 pb-20">
              {selectedData ? (
                selectedData.is_rest ? (
                  <div className="text-center py-10 text-green-400 bg-green-900/10 rounded-xl border border-green-900/30">
                     Rest Day 🛌
                  </div>
                ) : (
                  <>
                    {/* FORM INPUT */}
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                      <h3 className="text-xs font-bold text-yellow-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                         📝 Catat Set Baru
                      </h3>
                      <form onSubmit={handleAddLog} className="space-y-3">
                        
                        {/* 1. Pilih Gerakan (GABUNGAN DARI SEMUA OTOT) */}
                        <select 
                          value={formMain} 
                          onChange={e => {
                            setFormMain(e.target.value)
                            setFormType(''); setFormGrip(''); setFormMode(''); setFormSide('');
                          }}
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 text-sm"
                          required
                        >
                          <option value="">Pilih Latihan ({targetMuscles.join(' + ')})...</option>
                          {exerciseList.map((ex: any) => <option key={ex} value={ex}>{ex}</option>)}
                        </select>

                        {/* 2. Opsi Tambahan */}
                        {currentExDetail && (
                          <div className="grid grid-cols-2 gap-2 animate-in fade-in zoom-in-95 duration-200">
                            {currentExDetail.types?.length > 0 && (
                              <select value={formType} onChange={e => setFormType(e.target.value)} className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs" required>
                                <option value="">- Alat -</option>
                                {currentExDetail.types.map((t: string) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            )}
                            {currentExDetail.grips?.length > 0 && (
                              <select value={formGrip} onChange={e => setFormGrip(e.target.value)} className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs" required>
                                <option value="">- Grip -</option>
                                {currentExDetail.grips.map((g: string) => <option key={g} value={g}>{g}</option>)}
                              </select>
                            )}
                            {currentExDetail.modes?.length > 0 && (
                              <select value={formMode} onChange={e => setFormMode(e.target.value)} className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs" required>
                                <option value="">- Mode -</option>
                                {currentExDetail.modes.map((m: string) => <option key={m} value={m}>{m}</option>)}
                              </select>
                            )}
                            {showSideOption && (
                              <select value={formSide} onChange={e => setFormSide(e.target.value)} className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-2 text-xs text-yellow-400 font-bold" required>
                                <option value="">- Kiri / Kanan? -</option>
                                <option value="Left">Kiri</option>
                                <option value="Right">Kanan</option>
                              </select>
                            )}
                          </div>
                        )}

                        {/* 3. Berat & Reps */}
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                             <input type="number" placeholder="0" value={formWeight} onChange={e => setFormWeight(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-center text-sm" required />
                             <span className="absolute right-2 top-3 text-[10px] text-gray-500">KG</span>
                          </div>
                          <div className="relative flex-1">
                             <input type="number" placeholder="0" value={formReps} onChange={e => setFormReps(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-center text-sm" required />
                             <span className="absolute right-2 top-3 text-[10px] text-gray-500">REP</span>
                          </div>
                          <button type="submit" disabled={isLogLoading} className="bg-yellow-500 text-black font-bold px-4 rounded-lg hover:bg-yellow-400 text-lg">
                            {isLogLoading ? '...' : '+'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* LIST LOGS */}
                    <div className="space-y-2">
                      <h3 className="text-xs text-gray-500 font-bold uppercase">Riwayat Hari Ini</h3>
                      {logs.map((log) => (
                        <div key={log.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700 group hover:border-gray-600">
                          <div>
                            <div className="font-bold text-sm text-white">{log.exercise_name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                                <span className="text-yellow-500 font-bold">{log.weight_kg}kg</span> x {log.reps} reps
                            </div>
                          </div>
                          <button onClick={() => handleDeleteLog(log.id)} className="text-gray-600 hover:text-red-400 px-2 opacity-50 group-hover:opacity-100">✕</button>
                        </div>
                      ))}
                      {logs.length === 0 && <div className="text-center text-gray-600 text-xs italic py-4">Belum ada data latihan.</div>}
                    </div>
                  </>
                )
              ) : (
                <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Tidak ada jadwal di tanggal ini.</p>
                    <Link href="/new" className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm inline-block">
                        + Buat Jadwal
                    </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <Link href="/new" className="fixed bottom-6 right-6 bg-yellow-500 text-black w-14 h-14 rounded-full shadow-lg shadow-yellow-500/30 flex items-center justify-center text-3xl font-bold hover:scale-110 transition-transform">
        +
      </Link>
    </div>
  )
}