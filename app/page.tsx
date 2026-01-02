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

// --- UTILS ---
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

// --- CONFIG ---
const MUSCLE_OPTIONS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Cardio']

const EXERCISE_CONFIG: any = {
  // Config ini tetap ada untuk mapping nama latihan ke kategori cardio (jika perlu display khusus)
  'Cardio': {} 
}

export default function WeightTrackerPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<any[]>([])
  
  // State Modal & Data
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedData, setSelectedData] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  
  // Logic Edit Jadwal Otot
  const [targetMuscles, setTargetMuscles] = useState<string[]>([])
  const [isEditingSchedule, setIsEditingSchedule] = useState(false) 

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

  // --- 2. HANDLE DATE CLICK ---
  const onDateClick = (date: Date) => {
    const data = schedules.find(s => isSameDay(new Date(s.schedule_date), date))
    setSelectedDate(date)
    setSelectedData(data || null)
    setIsEditingSchedule(false)

    if (data) {
      parseAndSetMuscles(data.muscle_group)
      fetchLogs(data.id)
    } else {
      setLogs([])
      setTargetMuscles([])
    }
  }

  const parseAndSetMuscles = (muscleGroupString: string) => {
    let parsedMuscles: string[] = []
    try {
      if (muscleGroupString.startsWith('[')) {
        parsedMuscles = JSON.parse(muscleGroupString)
      } else {
        parsedMuscles = [muscleGroupString]
      }
    } catch (e) {
      parsedMuscles = [muscleGroupString]
    }
    setTargetMuscles(parsedMuscles)
  }

  const fetchLogs = async (scheduleId: string) => {
    const { data } = await supabase.from('weight_logs').select('*').eq('schedule_id', scheduleId).order('created_at', { ascending: true })
    if (data) setLogs(data)
    else setLogs([])
  }

  // --- 3. LOGIC CRUD JADWAL (Schedule) ---
  const toggleMuscleSelection = (muscle: string) => {
    if (targetMuscles.includes(muscle)) {
      setTargetMuscles(prev => prev.filter(m => m !== muscle))
    } else {
      setTargetMuscles(prev => [...prev, muscle])
    }
  }

  const saveScheduleUpdate = async () => {
    if (!selectedData) return

    // Jika user menghapus semua otot, kita anggap dia mau menghapus jadwal? 
    // Atau tetap simpan array kosong? Di sini kita simpan array kosong saja biar aman.
    const newMusclesString = JSON.stringify(targetMuscles)
    
    // Update ke Supabase
    const { error } = await supabase.from('content_schedule')
      .update({ muscle_group: newMusclesString })
      .eq('id', selectedData.id)

    if (!error) {
      setIsEditingSchedule(false)
      fetchSchedules() // Refresh warna kalender
    }
  }

  const handleDeleteLog = async (id: string) => {
    if(!confirm("Hapus history latihan ini?")) return
    await supabase.from('weight_logs').delete().eq('id', id)
    if (selectedData) fetchLogs(selectedData.id)
  }

  if (!isAuthenticated) return <div className="min-h-screen bg-gray-950"></div>

  return (
    <div className="text-white font-sans p-4 md:p-8 pb-24">
      {/* HEADER PAGE */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-500">Weight Tracker 🏋️</h1>
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1">
           <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="px-3 py-1 hover:bg-gray-700 rounded text-gray-400">◀</button>
           <span className="px-3 py-1 text-sm font-bold w-24 sm:w-32 text-center">{format(currentDate, 'MMM yyyy', { locale: id })}</span>
           <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="px-3 py-1 hover:bg-gray-700 rounded text-gray-400">▶</button>
        </div>
      </div>

      {/* GRID KALENDER */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-8">
        {['M','S','S','R','K','J','S'].map(d => <div key={d} className="text-center text-gray-500 text-xs font-bold py-2">{d}</div>)}
        {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => <div key={`empty-${i}`} />)}
        {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((date) => {
          const dayData = schedules.find(s => isSameDay(new Date(s.schedule_date), date))
          return (
            <div key={date.toString()} onClick={() => onDateClick(date)}
              className={cn(
                "aspect-square rounded-lg sm:rounded-xl border flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all relative group",
                dayData ? (dayData.is_rest ? "bg-green-900/20 border-green-800" : "bg-yellow-900/20 border-yellow-700") : "bg-gray-900 border-gray-800 hover:bg-gray-800",
                isToday(date) && "ring-2 ring-white"
              )}
            >
              <span className="text-sm font-bold z-10">{format(date, 'd')}</span>
              {dayData && !dayData.is_rest && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1"></div>}
            </div>
          )
        })}
      </div>

      {/* MODAL JADWAL & LOGS (VIEW ONLY + EDIT SCHEDULE) */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedDate(null)}></div>
          
          <div className="bg-gray-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-gray-800 shadow-2xl relative z-10 flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-10">
            
            {/* --- HEADER MODAL (JADWAL OTOT) --- */}
            <div className="p-5 border-b border-gray-700 bg-gray-900 rounded-t-3xl sticky top-0 z-20">
              <div className="flex justify-between items-start">
                 <div className="w-full">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">{format(selectedDate, 'EEEE, d MMMM', { locale: id })}</p>
                    
                    {/* MODE READ: TAMPILKAN OTOT + TOMBOL EDIT */}
                    {!isEditingSchedule && selectedData && !selectedData.is_rest && (
                      <div className="flex items-center gap-2 flex-wrap">
                         <div className="flex gap-2 flex-wrap">
                            {targetMuscles.map(m => (
                              <span key={m} className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded text-sm border border-yellow-500/30 font-bold">
                                {m}
                              </span>
                            ))}
                         </div>
                         <button onClick={() => setIsEditingSchedule(true)} className="text-gray-500 hover:text-white transition-colors bg-gray-800 p-1.5 rounded-full">
                           ✏️
                         </button>
                      </div>
                    )}
                    
                    {(!selectedData || selectedData.is_rest) && !isEditingSchedule && (
                       <h2 className="text-xl font-bold text-white">{selectedData?.is_rest ? "Rest Day 🛌" : "Belum ada jadwal"}</h2>
                    )}

                    {/* MODE EDIT: PILIH OTOT (CRUD JADWAL) */}
                    {isEditingSchedule && (
                      <div className="mt-2 bg-gray-800/50 p-3 rounded-xl border border-dashed border-gray-600 animate-in fade-in zoom-in-95">
                        <p className="text-xs text-gray-400 mb-2 font-bold uppercase">Ubah Target Otot:</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {MUSCLE_OPTIONS.map(opt => (
                            <button 
                              key={opt}
                              onClick={() => toggleMuscleSelection(opt)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                targetMuscles.includes(opt) 
                                  ? "bg-yellow-500 text-black border-yellow-500" 
                                  : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                              )}
                            >
                              {opt} {targetMuscles.includes(opt) && "✓"}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                           <button onClick={() => setIsEditingSchedule(false)} className="text-xs text-gray-400 hover:text-white px-3 py-1">Batal</button>
                           <button onClick={saveScheduleUpdate} className="text-xs bg-blue-600 text-white px-3 py-1 rounded font-bold hover:bg-blue-500">Simpan Perubahan</button>
                        </div>
                      </div>
                    )}
                 </div>
                 <button onClick={() => setSelectedDate(null)} className="bg-gray-800 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white shrink-0 ml-2">✕</button>
              </div>
            </div>

            {/* --- BODY MODAL (LIST LOGS SAJA) --- */}
            <div className="p-5 overflow-y-auto space-y-4 pb-10">
              {selectedData ? (
                selectedData.is_rest ? (
                  <div className="text-center py-10 text-green-400 bg-green-900/10 rounded-xl border border-green-900/30">
                     Istirahat yang cukup! 🌱
                  </div>
                ) : (
                  <>
                    {/* LIST LOGS (HANYA VIEW + DELETE) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <h3 className="text-xs text-gray-500 font-bold uppercase tracking-widest">Detail Latihan</h3>
                         <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">{logs.length} Set</span>
                      </div>
                      
                      {logs.map((log) => {
                        // Cek apakah ini cardio (berdasarkan rule nama atau logika berat 0)
                        const isCardio = log.weight_kg === 0 && log.reps > 0;
                        
                        return (
                          <div key={log.id} className="flex justify-between items-center p-3 rounded-lg border bg-gray-800 border-gray-700 hover:border-gray-600 transition-all">
                            <div className="flex-1 pr-4">
                              <div className="font-bold text-sm text-white break-words">{log.exercise_name}</div>
                              <div className="text-xs mt-1">
                                  {isCardio ? (
                                    <span className="text-blue-400 font-bold bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                                      ⏱️ {log.reps} Menit
                                    </span>
                                  ) : (
                                    <span className="text-yellow-500 font-bold bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-500/30">
                                      {log.weight_kg}kg <span className="text-gray-400 font-normal">x</span> {log.reps} reps
                                    </span>
                                  )}
                              </div>
                            </div>
                            
                            {/* Tombol Hapus (Untuk koreksi) */}
                            <button 
                               onClick={() => handleDeleteLog(log.id)} 
                               className="w-8 h-8 rounded flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors"
                               title="Hapus set ini"
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}
                      
                      {logs.length === 0 && (
                          <div className="text-center py-8 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                             <p className="text-gray-500 text-xs italic">Belum ada data latihan yang diinput.</p>
                          </div>
                      )}
                    </div>
                  </>
                )
              ) : (
                <div className="text-center py-8">
                    <p className="text-gray-500 mb-4 text-sm">Tidak ada jadwal latihan.</p>
                    <Link href="/new" className="bg-yellow-500 text-black px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform inline-block shadow-lg shadow-yellow-500/20">
                        + Buat Jadwal Baru
                    </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAB (Floating Action Button) - Shortcut ke halaman input baru */}
      <Link href="/new" className="fixed bottom-6 right-6 bg-yellow-500 text-black w-14 h-14 rounded-full shadow-lg shadow-yellow-500/30 flex items-center justify-center text-3xl font-bold hover:scale-110 transition-transform z-40">
        +
      </Link>
    </div>
  )
}