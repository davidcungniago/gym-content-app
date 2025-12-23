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

export default function Home() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedData, setSelectedData] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false) 

  // --- 1. Cek Login & Ambil Data ---
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

  // --- 2. LOGIKA WARNA (Sesuai Request) ---
  const getStatusColor = (item: any) => {
    if (!item) return "bg-gray-900 border-gray-800" // Kosong

    if (item.is_rest) return "bg-green-900/40 border-green-500/50" // Rest Day = Hijau Kalem

    const trainingDone = item.status === 'Done'
    const photoDone = item.photo_uploaded

    // HIJAU: Latihan Selesai DAN Foto Sudah Upload
    if (trainingDone && photoDone) return "bg-green-600 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
    
    // KUNING: Baru Salah Satu (Latihan doang ATAU Foto doang)
    if (trainingDone || photoDone) return "bg-yellow-600/90 border-yellow-400"
    
    // MERAH: Belum Dua-duanya
    return "bg-red-900/80 border-red-500"
  }

  // --- 3. Fungsi Upload ke Bucket 'progress-photos' ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedData) return
    
    setUploading(true)
    const file = e.target.files[0]
    
    // Nama file unik biar gak bentrok
    const fileExt = file.name.split('.').pop()
    const fileName = `${selectedData.id}-${Date.now()}.${fileExt}`
    
    // Upload ke bucket kamu: 'progress-photos'
    const { error: uploadError } = await supabase.storage
      .from('progress-photos') // Sesuaikan nama bucket kamu
      .upload(fileName, file)

    if (uploadError) {
      alert('Gagal upload: ' + uploadError.message)
      setUploading(false)
      return
    }

    // Ambil URL Publik supaya bisa ditampilkan
    const { data: { publicUrl } } = supabase.storage
      .from('progress-photos')
      .getPublicUrl(fileName)

    // Simpan URL ke Database
    const { error: dbError } = await supabase
      .from('content_schedule')
      .update({ 
        photo_uploaded: true, 
        photo_url: publicUrl 
      })
      .eq('id', selectedData.id)

    if (!dbError) {
      // Update tampilan langsung tanpa refresh
      const updatedItem = { ...selectedData, photo_uploaded: true, photo_url: publicUrl }
      setSchedules(prev => prev.map(item => item.id === selectedData.id ? updatedItem : item))
      setSelectedData(updatedItem)
    }
    setUploading(false)
  }

  // --- 4. Ganti Status Latihan ---
  const toggleTrainingStatus = async () => {
    if (!selectedData) return
    const newStatus = selectedData.status === 'Done' ? 'Planned' : 'Done'
    
    const { error } = await supabase
      .from('content_schedule')
      .update({ status: newStatus })
      .eq('id', selectedData.id)

    if (!error) {
      const updatedItem = { ...selectedData, status: newStatus }
      setSchedules(prev => prev.map(item => item.id === selectedData.id ? updatedItem : item))
      setSelectedData(updatedItem)
    }
  }

  // --- 5. Bikin Rest Day ---
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
      
      {/* Legenda Warna */}
      <div className="flex gap-3 px-6 text-[10px] text-gray-400 mb-2 justify-center pt-2">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-900 rounded-sm border border-red-500"></div> Kosong (0/2)</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-600 rounded-sm border border-yellow-400"></div> Proses (1/2)</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-600 rounded-sm border border-green-400 shadow-[0_0_5px_#22c55e]"></div> Selesai (2/2)</div>
      </div>

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

      {/* MODAL / POPUP */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setSelectedDate(null); setSelectedData(null); }}></div>
            <div className="bg-gray-900 w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-800 shadow-2xl relative z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 sm:hidden"></div>
                
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-gray-400 text-sm">{format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}</p>
                        <h2 className={cn("text-2xl font-bold mt-1", selectedData?.is_rest ? "text-green-400" : "text-white")}>
                            {selectedData ? (selectedData.is_rest ? "🛌 REST DAY" : selectedData.topic) : "Kosong"}
                        </h2>
                    </div>
                    <button onClick={() => setSelectedDate(null)} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white">✕</button>
                </div>

                {selectedData ? (
                    <div className="space-y-6">
                        {!selectedData.is_rest && (
                            <>
                                {/* 1. STATUS LATIHAN */}
                                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">Latihan</p>
                                        <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", 
                                            selectedData.status === 'Done' ? "bg-green-900 text-green-400 border-green-700" : "bg-red-900 text-red-400 border-red-700"
                                        )}>
                                            {selectedData.status === 'Done' ? "SELESAI ✅" : "BELUM ❌"}
                                        </span>
                                    </div>
                                    <button onClick={toggleTrainingStatus} className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-semibold transition-colors">
                                        {selectedData.status === 'Done' ? "Batalkan Latihan" : "Tandai Selesai Latihan"}
                                    </button>
                                </div>

                                {/* 2. UPLOAD FOTO */}
                                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">Foto Body</p>
                                        <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", 
                                            selectedData.photo_uploaded ? "bg-green-900 text-green-400 border-green-700" : "bg-red-900 text-red-400 border-red-700"
                                        )}>
                                            {selectedData.photo_uploaded ? "ADA FOTO ✅" : "BELUM ADA ❌"}
                                        </span>
                                    </div>

                                    {selectedData.photo_url ? (
                                        <div className="mb-4 relative group">
                                            <img src={selectedData.photo_url} alt="Progress" className="w-full h-56 object-cover rounded-xl border border-gray-600" />
                                        </div>
                                    ) : (
                                        <div className="w-full h-32 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-500 mb-3 bg-gray-900/50">
                                            <span>Belum ada foto progress</span>
                                        </div>
                                    )}

                                    <label className={cn(
                                        "w-full flex justify-center items-center py-3 px-4 rounded-xl cursor-pointer font-bold transition-all gap-2",
                                        uploading ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-yellow-400 hover:bg-yellow-300 text-black shadow-lg shadow-yellow-400/20"
                                    )}>
                                        {uploading ? "Mengupload... ⏳" : (
                                            <>📷 {selectedData.photo_url ? "Ganti Foto" : "Upload Foto Sekarang"}</>
                                        )}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                    </label>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        <Link href="/new" className="bg-yellow-400 text-black p-4 rounded-xl font-bold text-center hover:bg-yellow-300 shadow-lg shadow-yellow-400/20">+ Tambah Latihan</Link>
                        <button onClick={handleCreateRestDay} disabled={updating} className="bg-green-900/20 text-green-400 border border-green-900/50 p-4 rounded-xl font-bold hover:bg-green-900/40">🛌 Mark as Rest Day</button>
                    </div>
                )}
            </div>
        </div>
      )}
      <Link href="/new" className="fixed bottom-6 right-6 bg-yellow-400 text-black w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-40 text-2xl font-bold">+</Link>
    </main>
  )
}