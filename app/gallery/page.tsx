'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function GalleryPage() {
  const [photos, setPhotos] = useState<any[]>([])

  useEffect(() => {
    const fetchPhotos = async () => {
      // Ambil data yang photo_uploaded = true
      const { data } = await supabase
        .from('content_schedule')
        .select('*')
        .eq('photo_uploaded', true)
        .order('schedule_date', { ascending: false }) // Urutkan dari yang terbaru
      
      if (data) setPhotos(data)
    }
    fetchPhotos()
  }, [])

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">📷 Body Gallery</h1>
      
      {photos.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          <p>Belum ada foto progress.</p>
          <p className="text-sm">Upload lewat kalender dulu ya!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((item) => (
            <div key={item.id} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-800 border border-gray-700">
              <img 
                src={item.photo_url} 
                alt="Progress" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                <p className="text-white font-bold text-sm">{item.schedule_date}</p>
                <p className="text-yellow-400 text-xs">{item.muscle_group}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}