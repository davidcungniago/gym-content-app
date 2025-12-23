'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('Login Gagal: ' + error.message)
      setLoading(false)
    } else {
      // Berhasil login, lempar ke dashboard
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6 text-center">🔐 Login Coach</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input 
              type="email" 
              className="w-full bg-gray-900 p-3 rounded-lg border border-gray-600 text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email..."
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full bg-gray-900 p-3 rounded-lg border border-gray-600 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password..."
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-yellow-400 text-black font-bold p-3 rounded-lg hover:bg-yellow-300 transition-colors mt-4"
          >
            {loading ? 'Masuk...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </main>
  )
}