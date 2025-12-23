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

// --- KONFIGURASI LATIHAN & VARIASI (SESUAI REQUEST) ---
const EXERCISE_CONFIG: any = {
  'Back': {
    'Row': { types: ['Cable', 'Machine'], grips: ['High', 'Width'], modes: ['Single', 'Double'] },
    'Lat Pulldown': { types: ['Single', 'Bar'], modes: [] }, // Kalau Single nanti auto trigger Left/Right
    'Shrugs': { types: [], modes: [] },
    'Rear Delt Fly': { types: ['Machine', 'Cable'], modes: ['Single', 'Double'] },
    'Deadlift': { types: ['Conventional', 'Sumo'], modes: [] }
  },
  'Chest': {
    'Incline Press': { types: ['Dumbbell', 'Machine', 'Smith'], modes: [] },
    'Chest Fly': { types: ['Machine', 'Cable'], grips: ['High', 'Low'], modes: [] },
    'Bench Press': { types: ['Barbell', 'Dumbbell', 'Smith'], modes: [] },
    'Push Up': { types: [], modes: [] }
  },
  'Legs': {
    'Squat': { types: ['Hack Squat', 'Free Weight'], modes: [] },
    'Leg Press': { types: [], modes: ['Single', 'Double'] },
    'Leg Extension': { types: [], modes: ['Single', 'Double'] },
    'Leg Curl': { types: [], modes: ['Single', 'Double'] },
    'Calf Raise': { types: ['Standing', 'Seated'], modes: [] }
  },
  'Shoulders': {
    'Lateral Raise': { types: ['Machine', 'Cable', 'Free Weight'], modes: ['Single', 'Double'] },
    'Shoulder Press': { types: ['Machine', 'Free Weight', 'Smith'], modes: [] },
    'Front Raise': { types: ['Dumbbell', 'Cable'], modes: [] }
  },
  'Arms': {
    'Bayesian Curl': { types: [], modes: ['Single', 'Double'] },
    'Preacher Curl': { types: ['Free Weight', 'Machine'], modes: [] },
    'Bicep Curl': { types: ['Free Weight', 'Cable'], modes: ['Single', 'Double'] },
    'Tricep Extension': { types: [], modes: ['Single', 'Double'] },
    'Tricep Pushdown': { types: [], modes: ['Single', 'Double'] },
    'Dips': { types: ['Machine', 'Free Weight'], modes: [] },
    'Skullcrusher': { types: ['Barbell', 'Dumbbell'], modes: [] },
    'Overhead Extension': { types: ['Cable', 'Dumbbell'], modes: [] }
  },
  // Default fallback
  'Other': {}
}

export default function Home() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedData, setSelectedData] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false) 

  // State Weight Tracker
  const [logs, setLogs] = useState<any[]>([])
  const [isLogLoading, setIsLogLoading] = useState(false)
  
  // State Form Kompleks
  const [formMain, setFormMain] = useState('') // Nama Gerakan (Row)
  const [formType, setFormType] = useState('') // Alat (Cable/Machine)
  const [formGrip, setFormGrip] = useState('') // Grip (High/Width)
  const [formMode, setFormMode] = useState('') // Mode (Single/Double)
  const [formSide, setFormSide] = useState('') // Side (Left/Right)
  const [formWeight, setFormWeight] = useState('')
  const [formReps, setFormReps] = useState('')

  // --- 1. Cek Login & Fetch Jadwal ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/login')
      else {
        setIsAuthenticated(true)
        fetchSchedules()
      }
    }
    checkUser()
  }, [currentDate, router])

  const fetchSchedules = async () => {
    const start = startOfMonth(currentDate).toISOString()
    const end = endOfMonth(currentDate).toISOString()
    const { data } = await supabase
      .from('content_schedule')
      .select('*')
      .gte('schedule_date', start)
      .lte('schedule_date', end)
    if (data) setSchedules(data)
  }

  // --- Fetch Logs saat Modal Dibuka ---
  useEffect(() => {
    if (selectedData?.id) {
      fetchLogsForSchedule(selectedData.id)
      resetForm()
    }
  }, [selectedData])

  const resetForm = () => {
    setFormMain('')
    setFormType('')
    setFormGrip('')
    setFormMode('')
    setFormSide('')
    setFormWeight('')
    setFormReps('')
  }

  const fetchLogsForSchedule = async (scheduleId: string) => {
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: true })
    if (data) setLogs(data)
    else setLogs([])
  }

  // --- LOGIKA WARNA ---
  const getStatusColor = (item: any) => {
    if (!item) return "bg-gray-900 border-gray-800" 
    if (item.is_rest) return "bg-green-900/40 border-green-500/50" 

    const trainingDone = item.status === 'Done'
    const photoDone = item.photo_uploaded

    if (trainingDone && photoDone) return "bg-green-600 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
    if (trainingDone || photoDone) return "bg-yellow-600/90 border-yellow-400"
    return "bg-red-900/80 border-red-500"
  }

  // --- Fungsi Add Log (Weight Tracker) ---
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedData || !formMain) return

    setIsLogLoading(true)

    // Gabungkan nama gerakan + detail
    let fullName = formMain
    const details = []
    if (formType) details.push(formType)
    if (formGrip) details.push(formGrip)
    if (formMode) details.push(formMode)
    
    // Logika khusus: Kalau mode Single atau latihannya Lat Pulldown Single, harus ada Side
    if (formMode === 'Single' || formType === 'Single') {
        if (formSide) details.push(formSide)
    }

    if (details.length > 0) {
        fullName += ` (${details.join(', ')})`
    }

    const { error } = await supabase.from('weight_logs').insert([{
      schedule_id: selectedData.id,
      exercise_name: fullName,
      weight_kg: parseFloat(formWeight || '0'),
      reps: parseInt(formReps || '0'),
      date: selectedData.schedule_date
    }])

    if (!error) {
      // Reset angka saja biar gampang input set selanjutnya
      setFormWeight('')
      setFormReps('')
      fetchLogsForSchedule(selectedData.id) 
    }
    setIsLogLoading(false)
  }

  const handleDeleteLog = async (logId: string) => {
    const { error } = await supabase.from('weight_logs').delete().eq('id', logId)
    if (!error) fetchLogsForSchedule(selectedData.id)
  }

  // --- Helper Get Options ---
  const currentGroupConfig = selectedData ? EXERCISE_CONFIG[selectedData.muscle_group] : null
  const exerciseList = currentGroupConfig ? Object.keys(currentGroupConfig) : []
  
  // Ambil detail opsi berdasarkan gerakan yg dipilih
  const selectedExDetails = (formMain && currentGroupConfig) ? currentGroupConfig[formMain] : null

  // --- UI Upload & Status ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedData) return
    setUploading(true)
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `${selectedData.id}-${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage.from('progress-photos').upload(fileName, file)
    if (uploadError) { alert('Gagal upload'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('progress-photos').getPublicUrl(fileName)
    const { error: dbError } = await supabase.from('content_schedule').update({ photo_uploaded: true, photo_url: publicUrl }).eq('id', selectedData.id)

    if (!dbError) {
      const updatedItem = { ...selectedData, photo_uploaded: true, photo_url: publicUrl }
      setSchedules(prev => prev.map(item => item.id === selectedData.id ? updatedItem : item))
      setSelectedData(updatedItem)
    }
    setUploading(false)
  }

  const toggleTrainingStatus = async () => {
    if (!selectedData) return
    const newStatus = selectedData.status === 'Done' ? 'Planned' : 'Done'
    const { error } = await supabase.from('content_schedule').update({ status: newStatus }).eq('id', selectedData.id)
    if (!error) {
      const updatedItem = { ...selectedData, status: newStatus }
      setSchedules(prev => prev.map(item => item.id === selectedData.id ? updatedItem : item))
      setSelectedData(updatedItem)
    }
  }

  const handleCreateRestDay = async () => {
    if (!selectedDate) return
    setUpdating(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const { data } = await supabase.from('content_schedule').insert([{
        schedule_date: dateStr, topic: 'Rest Day', muscle_group: 'Rest', is_rest: true, status: 'Done'
    }]).select().single()
    if (data) {
        setSchedules([...schedules, data])
        setSelectedData(data)
    }
    setUpdating(false)
  }

  const onDateClick = (date: Date) => {
    const data = schedules.find(s => isSameDay(new Date(s.schedule_date), date))
    setSelectedDate(date)
    setSelectedData(data || null)
  }

  if (!isAuthenticated) return <div className="min-h-screen bg-gray-950"/>

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
  const startDayIndex = getDay(startOfMonth(currentDate))

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24 font-sans">
      <header className="px-6 pt-8 pb-4 flex justify-between items-center sticky top-0 bg-gray-950/90 backdrop-blur-md z-10 border-b border-gray-800">
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: id })}
          </h1>
          <p className="text-xs text-gray-400">Tracker Progress Otot 💪</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 text-gray-400">◀</button>
           <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 text-gray-400">▶</button>
        </div>
      </header>
      
      {/* Grid Kalender */}
      <div className="p-4">
        <div className="grid grid-cols-7 mb-2 text-center">
            {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => <div key={d} className="text-xs font-bold text-gray-500 py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startDayIndex }).map((_, i) => <div key={`empty-${i}`} />)}
            {daysInMonth.map((date) => {
                const dayData = schedules.find(s => isSameDay(new Date(s.schedule_date), date))
                const isTodayDate = isToday(date)
                
                return (
                    <div key={date.toString()} onClick={() => onDateClick(date)}
                        className={cn(
                            "aspect-square rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all active:scale-95 border",
                            getStatusColor(dayData), 
                            isTodayDate ? "ring-2 ring-white" : "border-transparent",
                            !dayData && "bg-gray-900 hover:bg-gray-800 border-gray-800"
                        )}>
                        <span className="text-sm font-medium z-10 text-white drop-shadow-md">
                            {format(date, 'd')}
                        </span>
                    </div>
                )
            })}
        </div>
      </div>

      {/* MODAL / POPUP UTAMA */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setSelectedDate(null); setSelectedData(null); }}></div>
            <div className="bg-gray-900 w-full max-w-lg p-0 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-800 shadow-2xl relative z-10 animate-slide-up max-h-[90vh] flex flex-col">
                
                {/* Header Modal */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-start sticky top-0 bg-gray-900 z-20 rounded-t-3xl">
                    <div>
                        <p className="text-gray-400 text-sm">{format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}</p>
                        <h2 className={cn("text-2xl font-bold mt-1", selectedData?.is_rest ? "text-green-400" : "text-white")}>
                            {selectedData ? (selectedData.is_rest ? "🛌 REST DAY" : selectedData.topic) : "Kosong"}
                        </h2>
                        {selectedData && !selectedData.is_rest && (
                           <span className="text-xs bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/20 mt-2 inline-block">
                             {selectedData.muscle_group} Day
                           </span>
                        )}
                    </div>
                    <button onClick={() => setSelectedDate(null)} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8 pb-20">
                    {selectedData ? (
                        !selectedData.is_rest ? (
                            <>
                                {/* --- STATUS & FOTO --- */}
                                <div className="grid grid-cols-2 gap-3">
                                   <div onClick={toggleTrainingStatus} className={cn("p-4 rounded-2xl border cursor-pointer transition-all text-center", 
                                      selectedData.status === 'Done' ? "bg-green-900/30 border-green-500/50" : "bg-gray-800 border-gray-700 hover:bg-gray-750")}>
                                      <div className="text-2xl mb-1">{selectedData.status === 'Done' ? "✅" : "🏋️"}</div>
                                      <div className="text-xs font-bold">{selectedData.status === 'Done' ? "Selesai" : "Belum Latihan"}</div>
                                   </div>

                                   <label className={cn("p-4 rounded-2xl border cursor-pointer transition-all text-center relative overflow-hidden group", 
                                      selectedData.photo_uploaded ? "bg-yellow-900/30 border-yellow-500/50" : "bg-gray-800 border-gray-700 hover:bg-gray-750")}>
                                      {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-xs">⏳</div>}
                                      {selectedData.photo_url ? (
                                        <img src={selectedData.photo_url} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"/>
                                      ) : <div className="text-2xl mb-1">📷</div>}
                                      <div className="relative z-10 text-xs font-bold">{selectedData.photo_uploaded ? "Ganti Foto" : "Upload Foto"}</div>
                                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                   </label>
                                </div>

                                {/* --- WEIGHT TRACKER (SMART FORM) --- */}
                                <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-5">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                      📊 Log Angkatan 
                                      <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                                        {logs.length} Set
                                      </span>
                                    </h3>

                                    <form onSubmit={handleAddLog} className="space-y-3 mb-6">
                                        {/* 1. Pilih Gerakan Utama */}
                                        <select 
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                                            value={formMain}
                                            onChange={e => {
                                                setFormMain(e.target.value)
                                                // Reset sub-opsi kalau ganti gerakan utama
                                                setFormType(''); setFormGrip(''); setFormMode(''); setFormSide('');
                                            }}
                                            required
                                        >
                                            <option value="">Pilih Gerakan {selectedData.muscle_group}...</option>
                                            {exerciseList.length > 0 ? (
                                                exerciseList.map((ex: any) => <option key={ex} value={ex}>{ex}</option>)
                                            ) : (
                                                <option value="Latihan Bebas">Latihan Bebas</option>
                                            )}
                                        </select>

                                        {/* 2. Sub-Options (Muncul Otomatis) */}
                                        {selectedExDetails && (
                                            <div className="grid grid-cols-2 gap-2 animate-fade-in">
                                                
                                                {/* Type (Machine/Cable/Smith/Free Weight) */}
                                                {selectedExDetails.types && selectedExDetails.types.length > 0 && (
                                                    <select 
                                                        className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-300"
                                                        value={formType} onChange={e => setFormType(e.target.value)} required
                                                    >
                                                        <option value="">- Jenis Alat -</option>
                                                        {selectedExDetails.types.map((t: string) => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                )}

                                                {/* Grip (High/Width/Low) */}
                                                {selectedExDetails.grips && selectedExDetails.grips.length > 0 && (
                                                    <select 
                                                        className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-300"
                                                        value={formGrip} onChange={e => setFormGrip(e.target.value)} required
                                                    >
                                                        <option value="">- Posisi Grip -</option>
                                                        {selectedExDetails.grips.map((g: string) => <option key={g} value={g}>{g}</option>)}
                                                    </select>
                                                )}

                                                {/* Mode (Single/Double) */}
                                                {selectedExDetails.modes && selectedExDetails.modes.length > 0 && (
                                                    <select 
                                                        className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-300"
                                                        value={formMode} onChange={e => setFormMode(e.target.value)} required
                                                    >
                                                        <option value="">- Mode -</option>
                                                        {selectedExDetails.modes.map((m: string) => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                )}

                                                {/* Side (Left/Right) - Muncul HANYA jika Single dipilih */}
                                                {(formMode === 'Single' || formType === 'Single') && (
                                                    <select 
                                                        className="bg-gray-900 border-yellow-500/50 border rounded-lg p-2 text-sm text-yellow-400 font-bold"
                                                        value={formSide} onChange={e => setFormSide(e.target.value)} required
                                                    >
                                                        <option value="">- Kiri / Kanan? -</option>
                                                        <option value="Left">Kiri (Left)</option>
                                                        <option value="Right">Kanan (Right)</option>
                                                    </select>
                                                )}
                                            </div>
                                        )}

                                        {/* 3. Input Berat & Reps */}
                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                              <input type="number" placeholder="0" className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none text-center"
                                                value={formWeight} onChange={e => setFormWeight(e.target.value)} required />
                                              <span className="absolute right-3 top-3 text-gray-500 text-xs">KG</span>
                                            </div>
                                            <div className="relative flex-1">
                                              <input type="number" placeholder="0" className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none text-center"
                                                value={formReps} onChange={e => setFormReps(e.target.value)} required />
                                              <span className="absolute right-3 top-3 text-gray-500 text-xs">REPS</span>
                                            </div>
                                            <button disabled={isLogLoading} className="bg-yellow-400 text-black font-bold px-4 rounded-xl hover:bg-yellow-300">
                                              {isLogLoading ? "..." : "+"}
                                            </button>
                                        </div>
                                    </form>

                                    {/* List Log */}
                                    <div className="space-y-2">
                                        {logs.length === 0 ? (
                                            <p className="text-center text-gray-500 text-xs py-2 italic">Belum ada set yang dicatat.</p>
                                        ) : (
                                            logs.map((log) => (
                                                <div key={log.id} className="flex justify-between items-center bg-gray-900 p-3 rounded-xl border border-gray-800">
                                                    <div className="max-w-[70%]">
                                                        <div className="font-bold text-sm text-white truncate">{log.exercise_name}</div>
                                                        <div className="text-[10px] text-gray-400">{format(new Date(log.created_at), 'HH:mm')}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <div className="text-yellow-400 font-bold">{log.weight_kg} <span className="text-[10px] text-gray-500">KG</span></div>
                                                            <div className="text-gray-300 text-xs">{log.reps} <span className="text-[10px] text-gray-500">REPS</span></div>
                                                        </div>
                                                        <button onClick={() => handleDeleteLog(log.id)} className="text-gray-600 hover:text-red-400 px-2">✕</button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-10">
                                <h3 className="text-green-400 font-bold text-xl mb-2">Enjoy your Rest! 🛌</h3>
                                <p className="text-gray-500">Otot tumbuh saat kamu istirahat.</p>
                                <button onClick={() => { handleCreateRestDay(); setSelectedDate(null); }} className="mt-6 text-sm text-red-400 underline">Batalkan Rest Day</button>
                            </div>
                        )
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            <Link href="/new" className="bg-yellow-400 text-black p-4 rounded-xl font-bold text-center hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2">
                              <span>📝</span> Buat Jadwal Latihan
                            </Link>
                            <button onClick={handleCreateRestDay} disabled={updating} className="bg-green-900/20 text-green-400 border border-green-900/50 p-4 rounded-xl font-bold hover:bg-green-900/40 flex items-center justify-center gap-2">
                              <span>🛌</span> Mark as Rest Day
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
      <Link href="/new" className="fixed bottom-6 right-6 bg-yellow-400 text-black w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-40 text-2xl font-bold">+</Link>
    </main>
  )
}