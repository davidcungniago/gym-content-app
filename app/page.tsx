'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, addMonths, subMonths, 
  getDay, isToday 
} from 'date-fns'
import { id } from 'date-fns/locale' // Bahasa Indonesia
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility untuk class
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function Home() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedData, setSelectedData] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // State untuk Loading aksi tombol
  const [updating, setUpdating] = useState(false)

  // 1. Cek Login & Ambil Data
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
  }, [currentDate, router]) // Refresh kalau ganti bulan

  const fetchSchedules = async () => {
    // Ambil data bulan yang sedang dilihat saja
    const start = startOfMonth(currentDate).toISOString()
    const end = endOfMonth(currentDate).toISOString()

    const { data, error } = await supabase
      .from('content_schedule')
      .select('*')
      .gte('schedule_date', start)
      .lte('schedule_date', end)
    
    if (data) setSchedules(data)
  }

  // 2. Fungsi Logika Kalender
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  })

  // Agar kalender rapi, kita butuh "padding" hari kosong di awal bulan
  const startDayIndex = getDay(startOfMonth(currentDate)) // 0 (Minggu) - 6 (Sabtu)

  // 3. Handle Klik Tanggal
  const onDateClick = (date: Date) => {
    const data = schedules.find(s => isSameDay(new Date(s.schedule_date), date))
    setSelectedDate(date)
    setSelectedData(data || null)
  }

  // 4. Handle Update (Rest / Foto)
  const handleUpdateStatus = async (type: 'rest' | 'photo') => {
    if (!selectedData || !selectedDate) return
    setUpdating(true)

    const updates: any = {}
    if (type === 'rest') {
        // Toggle Rest (Kebalikan dari status sekarang)
        updates.is_rest = !selectedData.is_rest
        // Kalau jadi Rest, status foto otomatis false biar masuk akal
        if (updates.is_rest) updates.photo_uploaded = false 
    }
    if (type === 'photo') {
        updates.photo_uploaded = !selectedData.photo_uploaded
    }

    const { error } = await supabase
      .from('content_schedule')
      .update(updates)
      .eq('id', selectedData.id)

    if (!error) {
        // Update state lokal biar cepat (tanpa fetch ulang)
        setSchedules(prev => prev.map(item => 
            item.id === selectedData.id ? { ...item, ...updates } : item
        ))
        setSelectedData({ ...selectedData, ...updates })
    }
    setUpdating(false)
  }

  // 5. Handle Tambah Rest Manual di tanggal kosong
  const handleCreateRestDay = async () => {
    if (!selectedDate) return
    setUpdating(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    
    const { data, error } = await supabase.from('content_schedule').insert([{
        schedule_date: dateStr,
        topic: 'Rest Day',
        muscle_group: 'Rest',
        is_rest: true,
        status: 'Done'
    }]).select().single()

    if (data) {
        setSchedules([...schedules, data])
        setSelectedData(data)
    }
    setUpdating(false)
  }

  if (!isAuthenticated) return <div className="min-h-screen bg-gray-950"/>

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24 font-sans selection:bg-yellow-500 selection:text-black">
      
      {/* HEADER */}
      <header className="px-6 pt-8 pb-4 flex justify-between items-center sticky top-0 bg-gray-950/80 backdrop-blur-md z-10 border-b border-gray-800">
        <div>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            {format(currentDate, 'MMMM yyyy', { locale: id })}
          </h1>
          <p className="text-xs text-gray-400">Manage your gains</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 text-gray-400">◀</button>
           <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 text-gray-400">▶</button>
        </div>
      </header>

      {/* CALENDAR GRID */}
      <div className="p-4">
        {/* Nama Hari */}
        <div className="grid grid-cols-7 mb-2 text-center">
            {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
                <div key={d} className="text-xs font-bold text-gray-500 py-2">{d}</div>
            ))}
        </div>

        {/* Tanggal */}
        <div className="grid grid-cols-7 gap-2">
            {/* Spacer untuk hari kosong di awal bulan */}
            {Array.from({ length: startDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} />
            ))}

            {daysInMonth.map((date) => {
                const dayData = schedules.find(s => isSameDay(new Date(s.schedule_date), date))
                const isTodayDate = isToday(date)
                
                return (
                    <div 
                        key={date.toString()}
                        onClick={() => onDateClick(date)}
                        className={cn(
                            "aspect-square rounded-2xl flex flex-col items-center justify-center relative cursor-pointer transition-all active:scale-95 border border-transparent",
                            isTodayDate ? "bg-gray-800 border-yellow-500/50" : "bg-gray-900 hover:bg-gray-800",
                            selectedDate && isSameDay(date, selectedDate) ? "ring-2 ring-yellow-400" : ""
                        )}
                    >
                        <span className={cn("text-sm font-medium z-10", isTodayDate ? "text-yellow-400" : "text-gray-300")}>
                            {format(date, 'd')}
                        </span>

                        {/* Indikator Titik */}
                        {dayData && (
                            <div className="absolute bottom-2 flex gap-1">
                                {dayData.is_rest ? (
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>
                                ) : (
                                    <>
                                        {/* Dot Status Latihan */}
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        {/* Dot Status Foto Body */}
                                        {dayData.photo_uploaded ? (
                                           <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_#facc15]"></div>
                                        ) : (
                                           <div className="w-1.5 h-1.5 rounded-full bg-gray-700 border border-gray-500"></div> 
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
      </div>

      {/* STATS SUMMARY (Optional - Visual Pemanis) */}
      <div className="px-6 mt-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-3xl border border-gray-800 flex justify-between items-center shadow-lg">
             <div>
                <p className="text-gray-400 text-xs">Total Latihan Bulan Ini</p>
                <h2 className="text-2xl font-bold text-white">
                    {schedules.filter(s => !s.is_rest).length} <span className="text-sm font-normal text-gray-500">Sesi</span>
                </h2>
             </div>
             <div className="h-10 w-[1px] bg-gray-700"></div>
             <div className="text-right">
                <p className="text-gray-400 text-xs">Rest Days</p>
                <h2 className="text-2xl font-bold text-green-400">
                    {schedules.filter(s => s.is_rest).length} <span className="text-sm font-normal text-gray-500">Hari</span>
                </h2>
             </div>
        </div>
      </div>


      {/* MODAL POPUP (Muncul dari bawah) */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* Backdrop Blur */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => { setSelectedDate(null); setSelectedData(null); }}
            ></div>

            {/* Content Modal */}
            <div className="bg-gray-900 w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-800 shadow-2xl relative z-10 animate-slide-up">
                
                {/* Garis Handle utk kesan swipe */}
                <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 sm:hidden"></div>

                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-gray-400 text-sm">{format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}</p>
                        {selectedData ? (
                            <h2 className={cn("text-2xl font-bold mt-1", selectedData.is_rest ? "text-green-400" : "text-white")}>
                                {selectedData.is_rest ? "🛌 REST DAY" : selectedData.topic}
                            </h2>
                        ) : (
                            <h2 className="text-xl font-bold text-gray-500 mt-1">Kosong / Belum Ada Jadwal</h2>
                        )}
                    </div>
                    {/* Close Button */}
                    <button onClick={() => setSelectedDate(null)} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white">✕</button>
                </div>

                {selectedData ? (
                    <div className="space-y-4">
                        {/* Jika BUKAN Rest Day */}
                        {!selectedData.is_rest && (
                            <>
                                <div className="flex gap-2 mb-4">
                                    <span className="bg-blue-900/50 text-blue-200 px-3 py-1 rounded-full text-xs border border-blue-800">
                                        {selectedData.muscle_group}
                                    </span>
                                    {selectedData.equipment_needed && (
                                        <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs border border-gray-700">
                                            🎥 {selectedData.equipment_needed}
                                        </span>
                                    )}
                                </div>

                                {/* Toggle Foto Body */}
                                <div 
                                    onClick={() => handleUpdateStatus('photo')}
                                    className={cn(
                                        "p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                                        selectedData.photo_uploaded 
                                            ? "bg-yellow-400/10 border-yellow-400/50" 
                                            : "bg-gray-800 border-gray-700 hover:border-gray-600"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center border",
                                            selectedData.photo_uploaded ? "bg-yellow-400 border-yellow-400 text-black" : "border-gray-500"
                                        )}>
                                            {selectedData.photo_uploaded && "✓"}
                                        </div>
                                        <span className={selectedData.photo_uploaded ? "text-yellow-400 font-bold" : "text-gray-300"}>
                                            {selectedData.photo_uploaded ? "Sudah Foto Body! 🔥" : "Belum Foto Body"}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Tombol Aksi Rest / Hapus */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                             <button 
                                onClick={() => handleUpdateStatus('rest')}
                                disabled={updating}
                                className={cn(
                                    "p-3 rounded-xl font-bold text-sm transition-colors",
                                    selectedData.is_rest 
                                        ? "bg-gray-800 text-white hover:bg-gray-700" 
                                        : "bg-green-900/30 text-green-400 border border-green-900 hover:bg-green-900/50"
                                )}
                             >
                                {selectedData.is_rest ? "❌ Batal Rest" : "🛌 Set Rest Day"}
                             </button>
                             <button 
                                onClick={() => {
                                    // Logika edit nanti bisa ditambah, skrg redirect ke form baru aja
                                    router.push('/new') 
                                }}
                                className="bg-gray-800 text-white p-3 rounded-xl font-bold text-sm hover:bg-gray-700"
                             >
                                ✏️ Edit
                             </button>
                        </div>
                    </div>
                ) : (
                    // Jika Tanggal KOSONG
                    <div className="grid grid-cols-1 gap-3">
                        <Link 
                            href="/new" 
                            className="bg-yellow-400 text-black p-4 rounded-xl font-bold text-center hover:bg-yellow-300 shadow-lg shadow-yellow-400/20"
                        >
                            + Tambah Latihan
                        </Link>
                        <button 
                            onClick={handleCreateRestDay}
                            disabled={updating}
                            className="bg-green-900/20 text-green-400 border border-green-900/50 p-4 rounded-xl font-bold hover:bg-green-900/40"
                        >
                            🛌 Mark as Rest Day
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Floating Action Button (Tetap ada buat shortcut) */}
      <Link href="/new" className="fixed bottom-6 right-6 bg-yellow-400 text-black w-14 h-14 rounded-full shadow-2xl shadow-yellow-500/50 flex items-center justify-center hover:scale-110 transition-transform z-40 text-2xl font-bold">
        +
      </Link>
    </main>
  )
}