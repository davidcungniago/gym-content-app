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

// --- CONFIG ---
const MUSCLE_OPTIONS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Cardio']

const EXERCISE_CONFIG: any = {
  'Chest': {
    'Incline Press': { types: ['Machine', 'Smith', 'Dumbbell'], grips: [], modes: [] },
    'Chest Fly': { types: ['Machine', 'Cable'], grips: ['High', 'Low'], modes: [] },
    'Bench Press': { types: ['Barbell', 'Dumbbell', 'Smith'], grips: [], modes: [] },
    'Push Up': { types: [], grips: [], modes: [] },
    'Dips': { types: ['Weighted', 'Bodyweight'], grips: [], modes: [] }
  },
  'Back': {
    'Row': { types: ['Cable', 'Machine', 'Dumbbell', 'Barbell'], grips: ['High', 'Width'], modes: ['Single', 'Double'] },
    'Lat Pulldown': { types: ['Single', 'Bar'], grips: ['Wide', 'Close', 'Reverse'], modes: [] }, 
    'Rear Delt Fly': { types: ['Machine', 'Cable', 'Dumbbell'], grips: [], modes: ['Single', 'Double'] },
    'Deadlift': { types: ['Conventional', 'Sumo', 'Trap Bar'], grips: [], modes: [] },
    'Pull Up': { types: ['Bodyweight', 'Weighted', 'Assisted'], grips: [], modes: [] }
  },
  'Legs': {
    'Squat': { types: ['Hack Squat', 'Free Weight', 'Goblet', 'Smith'], grips: [], modes: [] },
    'Leg Press': { types: [], grips: [], modes: ['Single', 'Double'] },
    'Leg Extension': { types: [], grips: [], modes: ['Single', 'Double'] },
    'Leg Curl': { types: ['Lying', 'Seated'], grips: [], modes: ['Single', 'Double'] },
    'Calf Raise': { types: ['Standing', 'Seated', 'Smith'], grips: [], modes: [] },
    'Lunges': { types: ['Dumbbell', 'Barbell', 'Walking'], grips: [], modes: [] }
  },
  'Shoulders': {
    'Lateral Raise': { types: ['Machine', 'Cable', 'Dumbbell'], grips: [], modes: ['Single', 'Double'] },
    'Shoulder Press': { types: ['Machine', 'Dumbbell', 'Smith', 'Barbell'], grips: [], modes: [] },
    'Front Raise': { types: ['Dumbbell', 'Cable', 'Plate'], grips: [], modes: [] },
    'Face Pull': { types: ['Cable'], grips: [], modes: [] }
  },
  'Biceps': {
    'Bicep Curl': { types: ['Dumbbell', 'Barbell', 'Cable'], grips: [], modes: ['Single', 'Double'] },
    'Preacher Curl': { types: ['Machine', 'EZ Bar', 'Dumbbell'], grips: [], modes: ['Single', 'Double'] },
    'Hammer Curl': { types: ['Dumbbell', 'Cable'], grips: [], modes: ['Single', 'Double'] },
    'Concentration Curl': { types: ['Dumbbell'], grips: [], modes: [] }
  },
  'Triceps': {
    'Tricep Pushdown': { types: ['Cable'], grips: ['Rope', 'Bar', 'V-Bar'], modes: ['Single', 'Double'] },
    'Skullcrusher': { types: ['Barbell', 'Dumbbell', 'EZ Bar'], grips: [], modes: [] },
    'Overhead Extension': { types: ['Dumbbell', 'Cable'], grips: [], modes: ['Single', 'Double'] },
    'Dips': { types: ['Machine', 'Bench', 'Bodyweight'], grips: [], modes: [] }
  },
  'Abs': {
    'Plank': { types: [], grips: [], modes: [] },
    'Crunches': { types: ['Machine', 'Mat', 'Cable'], grips: [], modes: [] },
    'Leg Raise': { types: ['Hanging', 'Lying', 'Captain Chair'], grips: [], modes: [] },
    'Russian Twist': { types: ['Weighted', 'Bodyweight'], grips: [], modes: [] },
    'Ab Wheel': { types: [], grips: [], modes: [] }
  },
  'Cardio': {
    'Treadmill': { types: ['Incline', 'Flat'], grips: [], modes: ['Walk', 'Run', 'Sprint'] },
    'Static Bike': { types: [], grips: [], modes: [] },
    'Elliptical': { types: [], grips: [], modes: [] },
    'Running': { types: ['Outdoor', 'Track'], grips: [], modes: [] },
    'Jump Rope': { types: [], grips: [], modes: [] },
    'Swimming': { types: [], grips: [], modes: [] }
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
  
  // Logic Config Otot
  const [targetMuscles, setTargetMuscles] = useState<string[]>([])
  const [combinedExercises, setCombinedExercises] = useState<any>({})

  // Form Input
  const [formMain, setFormMain] = useState('')
  const [formType, setFormType] = useState('')
  const [formGrip, setFormGrip] = useState('')
  const [formMode, setFormMode] = useState('')
  const [formSide, setFormSide] = useState('') 
  const [formWeight, setFormWeight] = useState('')
  const [formReps, setFormReps] = useState('') 
  
  // EDIT STATE
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [isEditingSchedule, setIsEditingSchedule] = useState(false)
  
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

  // --- 2. HANDLE DATE CLICK ---
  const onDateClick = (date: Date) => {
    const data = schedules.find(s => isSameDay(new Date(s.schedule_date), date))
    setSelectedDate(date)
    setSelectedData(data || null)
    setIsEditingSchedule(false) // Reset mode edit schedule
    resetForm()

    if (data) {
      parseAndSetMuscles(data.muscle_group)
      fetchLogs(data.id)
    } else {
      setLogs([])
      setTargetMuscles([])
      setCombinedExercises({})
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
    updateCombinedExercises(parsedMuscles)
  }

  const updateCombinedExercises = (muscles: string[]) => {
    let mergedExercises: any = {}
    muscles.forEach(muscle => {
      const config = EXERCISE_CONFIG[muscle]
      if (config) {
        mergedExercises = { ...mergedExercises, ...config }
      }
    })
    setCombinedExercises(mergedExercises)
  }

  const fetchLogs = async (scheduleId: string) => {
    const { data } = await supabase.from('weight_logs').select('*').eq('schedule_id', scheduleId).order('created_at', { ascending: true })
    if (data) setLogs(data)
    else setLogs([])
  }

  const resetForm = () => {
    setFormMain(''); setFormType(''); setFormGrip(''); setFormMode(''); setFormSide(''); setFormWeight(''); setFormReps('');
    setEditingLogId(null)
  }

  // --- 3. EDIT SCHEDULE LOGIC ---
  const toggleMuscleSelection = (muscle: string) => {
    if (targetMuscles.includes(muscle)) {
      setTargetMuscles(prev => prev.filter(m => m !== muscle))
    } else {
      setTargetMuscles(prev => [...prev, muscle])
    }
  }

  const saveScheduleUpdate = async () => {
    if (!selectedData) return
    const newMusclesString = JSON.stringify(targetMuscles)
    
    const { error } = await supabase.from('content_schedule')
      .update({ muscle_group: newMusclesString })
      .eq('id', selectedData.id)

    if (!error) {
      setIsEditingSchedule(false)
      updateCombinedExercises(targetMuscles)
      fetchSchedules() // Refresh calendar
    }
  }

  // --- 4. LOG LOGIC (ADD & UPDATE) ---
  const isCardioSelected = () => {
    if (!formMain) return false
    return Object.keys(EXERCISE_CONFIG['Cardio'] || {}).includes(formMain)
  }

  const handleAddOrUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedData) return
    setIsLogLoading(true)

    const isCardio = isCardioSelected()

    let details = []
    if (formType) details.push(formType)
    if (formGrip) details.push(formGrip)
    if (formMode) details.push(formMode)
    if ((formMode === 'Single' || formType === 'Single') && formSide) details.push(formSide)

    const fullName = details.length > 0 ? `${formMain} (${details.join(', ')})` : formMain
    const weightToSave = isCardio ? 0 : (parseFloat(formWeight) || 0)
    const repsToSave = parseInt(formReps) || 0

    const payload = {
      schedule_id: selectedData.id,
      exercise_name: fullName,
      weight_kg: weightToSave,
      reps: repsToSave, 
      date: selectedData.schedule_date
    }

    let error;
    if (editingLogId) {
      // UPDATE MODE
      const { error: err } = await supabase.from('weight_logs').update(payload).eq('id', editingLogId)
      error = err
    } else {
      // CREATE MODE
      const { error: err } = await supabase.from('weight_logs').insert([payload])
      error = err
    }

    if (!error) {
      resetForm()
      fetchLogs(selectedData.id)
    }
    setIsLogLoading(false)
  }

  const handleEditLogClick = (log: any) => {
    setEditingLogId(log.id)
    
    // Parse Name & Details: "Lat Pulldown (Wide, Single)"
    const parts = log.exercise_name.split(' (')
    const mainName = parts[0]
    setFormMain(mainName)

    // Reset details first
    setFormType(''); setFormGrip(''); setFormMode(''); setFormSide('');

    if (parts.length > 1) {
      const detailsString = parts[1].replace(')', '')
      const detailsArray = detailsString.split(', ')
      
      // Try to map details back to states (simple heuristic)
      const config = combinedExercises[mainName]
      if (config) {
        detailsArray.forEach((d: string) => {
          if (config.types?.includes(d)) setFormType(d)
          if (config.grips?.includes(d)) setFormGrip(d)
          if (config.modes?.includes(d)) setFormMode(d)
          if (d === 'Left' || d === 'Right') setFormSide(d)
        })
      }
    }

    // Set Weight/Reps
    const isCardio = Object.keys(EXERCISE_CONFIG['Cardio'] || {}).includes(mainName)
    if (isCardio) {
       setFormReps(log.reps.toString()) // Duration
       setFormWeight('')
    } else {
       setFormWeight(log.weight_kg.toString())
       setFormReps(log.reps.toString())
    }
  }

  const handleDeleteLog = async (id: string) => {
    if(!confirm("Hapus set ini?")) return
    await supabase.from('weight_logs').delete().eq('id', id)
    if (selectedData) fetchLogs(selectedData.id)
  }

  // --- RENDER HELPERS ---
  const exerciseList = Object.keys(combinedExercises).sort()
  const currentExDetail = formMain ? combinedExercises[formMain] : null
  const showSideOption = formMode === 'Single' || formType === 'Single'
  const isCardioMode = isCardioSelected()

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

      {/* MODAL INPUT LATIHAN */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedDate(null)}></div>
          
          <div className="bg-gray-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-gray-800 shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
            
            {/* Header Modal */}
            <div className="p-5 border-b border-gray-700 bg-gray-900 rounded-t-3xl sticky top-0 z-20">
              <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-gray-400 text-xs">{format(selectedDate, 'EEEE, d MMMM', { locale: id })}</p>
                    
                    {/* List Otot Header */}
                    <div className="flex items-center gap-2 mt-1">
                      {selectedData && !isEditingSchedule ? (
                        <>
                          <h2 className="text-xl font-bold text-white flex gap-2 flex-wrap">
                            {targetMuscles.map(m => (
                              <span key={m} className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded text-sm border border-yellow-500/30">
                                {m}
                              </span>
                            ))}
                          </h2>
                          {!selectedData.is_rest && (
                            <button onClick={() => setIsEditingSchedule(true)} className="text-gray-500 hover:text-white transition-colors">
                              ✏️
                            </button>
                          )}
                        </>
                      ) : (
                         <h2 className="text-xl font-bold text-white">
                           {selectedData?.is_rest ? "Rest Day 🛌" : "Jadwal Baru"}
                         </h2>
                      )}
                    </div>
                 </div>
                 <button onClick={() => setSelectedDate(null)} className="bg-gray-800 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white">✕</button>
              </div>

              {/* EDITOR JADWAL OTOT */}
              {isEditingSchedule && (
                <div className="mt-4 bg-gray-800/50 p-3 rounded-xl border border-dashed border-gray-600 animate-in fade-in zoom-in-95">
                  <p className="text-xs text-gray-400 mb-2 font-bold uppercase">Edit Target Otot:</p>
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

            {/* Isi Modal */}
            <div className="p-5 overflow-y-auto space-y-6 pb-20">
              {selectedData ? (
                selectedData.is_rest ? (
                  <div className="text-center py-10 text-green-400 bg-green-900/10 rounded-xl border border-green-900/30">
                     Enjoy your recovery! 🌱
                  </div>
                ) : (
                  <>
                    {/* FORM INPUT */}
                    <div className={cn("bg-gray-800/50 p-4 rounded-xl border", editingLogId ? "border-blue-500/50 bg-blue-900/10" : "border-gray-700")}>
                      <div className="flex justify-between items-center mb-3">
                         <h3 className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2", editingLogId ? "text-blue-400" : "text-yellow-400")}>
                            {editingLogId ? "✏️ Edit Set Latihan" : "📝 Catat Progress"}
                         </h3>
                         {editingLogId && <button onClick={resetForm} className="text-xs text-gray-400 underline">Batal Edit</button>}
                      </div>

                      <form onSubmit={handleAddOrUpdateLog} className="space-y-3">
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

                        {currentExDetail && (
                          <div className="grid grid-cols-2 gap-2 animate-in fade-in zoom-in-95 duration-200">
                            {currentExDetail.types?.length > 0 && (
                              <select value={formType} onChange={e => setFormType(e.target.value)} className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs" required>
                                <option value="">- Tipe -</option>
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
                                <option value="">- Sisi -</option>
                                <option value="Left">Kiri</option>
                                <option value="Right">Kanan</option>
                              </select>
                            )}
                          </div>
                        )}

                        {/* INPUT BERAT & REPS (GRID LAYOUT FIX) */}
                        {isCardioMode ? (
                           <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                             <div className="relative">
                               <input 
                                  type="number" placeholder="0" value={formReps} onChange={e => setFormReps(e.target.value)} 
                                  className="w-full bg-gray-950 border border-blue-500 rounded-lg p-3 text-center text-sm font-bold focus:ring-1 focus:ring-blue-500" required 
                               />
                               <span className="absolute right-3 top-3 text-[10px] text-blue-400 font-bold">MENIT</span>
                             </div>
                             <button type="submit" disabled={isLogLoading} className="h-11 px-5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center justify-center">
                               {editingLogId ? 'Update' : '+'}
                             </button>
                           </div>
                        ) : (
                          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                             <div className="relative w-full">
                                <input type="number" placeholder="0" value={formWeight} onChange={e => setFormWeight(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-center text-sm font-bold" required />
                                <span className="absolute right-2 top-3 text-[10px] text-gray-500">KG</span>
                             </div>
                             <div className="relative w-full">
                                <input type="number" placeholder="0" value={formReps} onChange={e => setFormReps(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-center text-sm font-bold" required />
                                <span className="absolute right-2 top-3 text-[10px] text-gray-500">REP</span>
                             </div>
                             <button type="submit" disabled={isLogLoading} className={cn("h-11 px-4 rounded-lg font-bold text-black flex items-center justify-center min-w-[50px]", editingLogId ? "bg-blue-500 text-white" : "bg-yellow-500")}>
                               {editingLogId ? '✓' : '+'}
                             </button>
                          </div>
                        )}
                      </form>
                    </div>

                    {/* LIST LOGS */}
                    <div className="space-y-2">
                      <h3 className="text-xs text-gray-500 font-bold uppercase">Riwayat Hari Ini</h3>
                      {logs.map((log) => {
                        const isLogCardio = Object.keys(EXERCISE_CONFIG['Cardio'] || {}).includes(log.exercise_name.split(' (')[0])
                        const isBeingEdited = log.id === editingLogId
                        
                        return (
                          <div key={log.id} className={cn("flex justify-between items-center p-3 rounded-lg border transition-all", isBeingEdited ? "bg-blue-900/20 border-blue-500" : "bg-gray-800 border-gray-700 hover:border-gray-600")}>
                            <div>
                              <div className="font-bold text-sm text-white">{log.exercise_name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                  {isLogCardio ? (
                                    <span className="text-blue-400 font-bold">⏱️ {log.reps} Menit</span>
                                  ) : (
                                    <><span className="text-yellow-500 font-bold">{log.weight_kg}kg</span> x {log.reps} reps</>
                                  )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                               <button onClick={() => handleEditLogClick(log)} className="w-8 h-8 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700">
                                 ✏️
                               </button>
                               <button onClick={() => handleDeleteLog(log.id)} className="w-8 h-8 rounded flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-gray-700">
                                 ✕
                               </button>
                            </div>
                          </div>
                        )
                      })}
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