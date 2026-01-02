'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

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

export default function NewWorkoutPage() {
  const router = useRouter()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [muscles, setMuscles] = useState<string[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [scheduleId, setScheduleId] = useState<string | null>(null)
  const [isRest, setIsRest] = useState(false)

  // Form States
  const [formMain, setFormMain] = useState('')
  const [formType, setFormType] = useState('')
  const [formGrip, setFormGrip] = useState('')
  const [formMode, setFormMode] = useState('')
  const [formSide, setFormSide] = useState('')
  
  // State Input Angka
  const [formWeight, setFormWeight] = useState('') 
  const [formReps, setFormReps] = useState('')
  
  // State Khusus Cardio (Speed vs Pace)
  const [cardioMetric, setCardioMetric] = useState('Speed') // 'Speed' | 'Pace'

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
    else checkExistingSchedule(date)
  }

  const checkExistingSchedule = async (selectedDate: string) => {
    const { data } = await supabase.from('content_schedule').select('*').eq('schedule_date', selectedDate).single()
    if (data) {
      setScheduleId(data.id)
      setIsRest(data.is_rest)
      try {
        setMuscles(JSON.parse(data.muscle_group))
      } catch {
        setMuscles([data.muscle_group])
      }
      fetchLogs(data.id)
    } else {
      setScheduleId(null)
      setMuscles([])
      setLogs([])
      setIsRest(false)
    }
  }

  const fetchLogs = async (id: string) => {
    const { data } = await supabase.from('weight_logs').select('*').eq('schedule_id', id).order('created_at')
    if (data) setLogs(data)
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value)
    checkExistingSchedule(e.target.value)
  }

  const toggleMuscle = (m: string) => {
    if (muscles.includes(m)) setMuscles(muscles.filter(x => x !== m))
    else setMuscles([...muscles, m])
  }

  // --- LOGIC UTAMA: CREATE / UPDATE SCHEDULE ---
  const ensureSchedule = async () => {
    if (scheduleId) return scheduleId

    const { data, error } = await supabase.from('content_schedule').insert([{
      schedule_date: date,
      muscle_group: JSON.stringify(isRest ? ['Rest'] : muscles),
      is_rest: isRest,
      notes: ''
    }]).select().single()

    if (error) {
      alert('Gagal buat jadwal')
      return null
    }
    setScheduleId(data.id)
    return data.id
  }

  // --- LOGIC INPUT LATIHAN ---
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const activeId = await ensureSchedule()
    
    if (!activeId) {
      setLoading(false)
      return
    }

    // Cek apakah cardio
    const isCardioLog = Object.keys(EXERCISE_CONFIG['Cardio']).includes(formMain)

    // Susun Nama Latihan
    let details = []
    if (formType) details.push(formType)
    if (formGrip) details.push(formGrip)
    if (formMode) details.push(formMode)
    if ((formMode === 'Single' || formType === 'Single') && formSide) details.push(formSide)
    
    // Jika Cardio, tambahkan info Metric (Speed/Pace) ke nama agar tersimpan
    if (isCardioLog) {
      details.push(cardioMetric) 
    }

    const fullName = details.length > 0 ? `${formMain} (${details.join(', ')})` : formMain
    
    const valWeight = parseFloat(formWeight) || 0
    const valReps = parseInt(formReps) || 0

    const { error } = await supabase.from('weight_logs').insert([{
      schedule_id: activeId,
      exercise_name: fullName,
      weight_kg: valWeight, // Disini kita simpan Speed/Pace/Berat
      reps: valReps,        // Disini kita simpan Menit/Reps
      date: date
    }])

    if (!error) {
      // Reset Form Partial (Keep formMain & Metric for ease of use)
      setFormType(''); setFormGrip(''); setFormMode(''); setFormSide(''); 
      setFormWeight('');
      fetchLogs(activeId)
    }
    setLoading(false)
  }

  const handleDeleteLog = async (logId: string) => {
    await supabase.from('weight_logs').delete().eq('id', logId)
    if (scheduleId) fetchLogs(scheduleId)
  }

  const getCombinedExercises = () => {
    let combined: any = {}
    const musclesToUse = muscles.length > 0 ? muscles : MUSCLE_OPTIONS
    musclesToUse.forEach(m => {
      if (EXERCISE_CONFIG[m]) {
        combined = { ...combined, ...EXERCISE_CONFIG[m] }
      }
    })
    return combined
  }

  const exerciseOptions = getCombinedExercises()
  const sortedExercises = Object.keys(exerciseOptions).sort()
  const currentDetail = formMain ? exerciseOptions[formMain] : null
  const showSideOption = formMode === 'Single' || formType === 'Single'
  
  // Cek apakah yang dipilih adalah Cardio
  const isCardio = Object.keys(EXERCISE_CONFIG['Cardio']).includes(formMain)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 pb-24">
      <div className="max-w-lg mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
           <h1 className="text-2xl font-bold text-yellow-500">Input Latihan</h1>
           <button onClick={() => router.push('/tracker')} className="text-sm text-gray-400 hover:text-white">
             Batal ✕
           </button>
        </div>

        {/* DATE PICKER */}
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
           <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Tanggal</label>
           <input 
             type="date" 
             value={date} 
             onChange={handleDateChange}
             className="w-full bg-gray-950 text-white p-3 rounded-lg border border-gray-700 outline-none focus:border-yellow-500"
           />
           <div className="mt-2 text-xs text-gray-400 text-right">
             {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: id })}
           </div>
        </div>

        {/* PILIH OTOT */}
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center mb-3">
             <label className="text-xs text-gray-500 uppercase font-bold">Target Otot</label>
             <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Rest Day?</label>
                <input type="checkbox" checked={isRest} onChange={e => setIsRest(e.target.checked)} className="w-4 h-4 accent-green-500"/>
             </div>
          </div>
          
          {!isRest && (
            <div className="flex flex-wrap gap-2">
              {MUSCLE_OPTIONS.map(m => (
                <button
                  key={m}
                  onClick={() => toggleMuscle(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    muscles.includes(m) 
                      ? 'bg-yellow-500 text-black border-yellow-500' 
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {m} {muscles.includes(m) && '✓'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* FORM INPUT SET */}
        {!isRest && (
          <form onSubmit={handleAddLog} className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-4 shadow-xl">
             <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Tambah Set</h3>
                {isCardio && (
                  <div className="flex bg-gray-800 rounded-lg p-0.5 border border-gray-700">
                     <button type="button" onClick={() => setCardioMetric('Speed')} className={`px-3 py-1 text-[10px] font-bold rounded ${cardioMetric === 'Speed' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Speed</button>
                     <button type="button" onClick={() => setCardioMetric('Pace')} className={`px-3 py-1 text-[10px] font-bold rounded ${cardioMetric === 'Pace' ? 'bg-green-600 text-white' : 'text-gray-400'}`}>Pace</button>
                  </div>
                )}
             </div>

             {/* Dropdown Latihan */}
             <select 
               value={formMain} 
               onChange={e => {
                 setFormMain(e.target.value)
                 setFormType(''); setFormGrip(''); setFormMode(''); setFormSide('');
               }}
               className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white text-sm outline-none focus:border-yellow-500"
               required
             >
               <option value="">-- Pilih Latihan --</option>
               {sortedExercises.map((ex: string) => <option key={ex} value={ex}>{ex}</option>)}
             </select>

             {/* Detail Variasi */}
             {currentDetail && (
               <div className="grid grid-cols-2 gap-2 animate-in fade-in zoom-in-95">
                 {currentDetail.types?.length > 0 && (
                   <select value={formType} onChange={e => setFormType(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-300">
                     <option value="">- Tipe -</option>
                     {currentDetail.types.map((t:string) => <option key={t} value={t}>{t}</option>)}
                   </select>
                 )}
                 {currentDetail.grips?.length > 0 && (
                   <select value={formGrip} onChange={e => setFormGrip(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-300">
                     <option value="">- Grip -</option>
                     {currentDetail.grips.map((g:string) => <option key={g} value={g}>{g}</option>)}
                   </select>
                 )}
                 {currentDetail.modes?.length > 0 && (
                   <select value={formMode} onChange={e => setFormMode(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-300">
                     <option value="">- Mode -</option>
                     {currentDetail.modes.map((m:string) => <option key={m} value={m}>{m}</option>)}
                   </select>
                 )}
                 {showSideOption && (
                   <select value={formSide} onChange={e => setFormSide(e.target.value)} className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-2 text-xs text-yellow-500 font-bold">
                     <option value="">- Sisi -</option>
                     <option value="Left">Kiri</option>
                     <option value="Right">Kanan</option>
                   </select>
                 )}
               </div>
             )}

             {/* INPUT DATA (DINAMIS) */}
             <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
               
               {/* KOLOM 1: BERAT / SPEED / PACE */}
               <div className="relative">
                 <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block">
                    {isCardio ? (cardioMetric === 'Speed' ? "SPEED (Km/h)" : "PACE (Min/km)") : "BERAT (Kg)"}
                 </label>
                 <input 
                   type="number" 
                   step={isCardio ? "0.01" : "1"} // Izinkan desimal
                   placeholder="0" 
                   value={formWeight} 
                   onChange={e => setFormWeight(e.target.value)} 
                   className={`w-full bg-gray-950 border rounded-lg p-3 text-center font-bold outline-none focus:ring-1 ${
                     isCardio 
                       ? (cardioMetric === 'Speed' ? 'border-blue-500 text-blue-400 focus:ring-blue-500' : 'border-green-500 text-green-400 focus:ring-green-500')
                       : 'border-gray-700 focus:ring-yellow-500'
                   }`}
                 />
               </div>

               {/* KOLOM 2: REPS / DURASI */}
               <div className="relative">
                 <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block">
                    {isCardio ? "DURASI (Min)" : "REPS"}
                 </label>
                 <input 
                   type="number" 
                   placeholder="0" 
                   value={formReps} 
                   onChange={e => setFormReps(e.target.value)} 
                   className={`w-full bg-gray-950 border rounded-lg p-3 text-center font-bold outline-none focus:ring-1 ${isCardio ? 'border-blue-500 text-blue-400 focus:ring-blue-500' : 'border-gray-700 focus:ring-yellow-500'}`}
                   required 
                 />
               </div>

               {/* BUTTON */}
               <button 
                 type="submit" 
                 disabled={loading}
                 className={`h-[46px] w-[50px] rounded-lg font-bold text-xl flex items-center justify-center transition-transform active:scale-95 ${
                   loading ? 'bg-gray-700' : 
                   (isCardio ? (cardioMetric === 'Speed' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white') : 'bg-yellow-500 hover:bg-yellow-400 text-black')
                 }`}
               >
                 {loading ? '...' : '+'}
               </button>
             </div>
          </form>
        )}

        {/* LIST PREVIEW HARI INI */}
        <div className="space-y-2 pb-10">
          {logs.map((log, idx) => {
            const exerciseNameOnly = log.exercise_name.split(' (')[0]
            const isLogCardio = Object.keys(EXERCISE_CONFIG['Cardio']).includes(exerciseNameOnly)
            const isPace = log.exercise_name.includes('Pace')

            return (
              <div key={log.id} className="flex justify-between items-center bg-gray-900 border border-gray-800 p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                <div className="flex gap-3 items-center">
                   <span className="text-xs text-gray-600 font-mono">#{idx + 1}</span>
                   <div>
                      <div className="text-sm font-bold text-white break-words">{log.exercise_name}</div>
                      <div className="text-xs mt-1">
                        {isLogCardio ? (
                           <span className={isPace ? "text-green-400 font-bold" : "text-blue-400 font-bold"}>
                             {isPace ? "🏃" : "⚡"} {log.weight_kg} {isPace ? "min/km" : "km/h"} &nbsp; • &nbsp; ⏱️ {log.reps} Min
                           </span>
                        ) : (
                           <span className="text-yellow-500">
                             {log.weight_kg}kg <span className="text-gray-500">x</span> {log.reps} reps
                           </span>
                        )}
                      </div>
                   </div>
                </div>
                <button onClick={() => handleDeleteLog(log.id)} className="text-gray-600 hover:text-red-500 px-2 py-1">✕</button>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}