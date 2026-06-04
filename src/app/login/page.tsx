'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert('Błąd: ' + error.message)
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800">
        <h1 className="text-3xl font-bold mb-8 text-center text-blue-500">Typer Mundial 2026</h1>
        <input 
          type="email" placeholder="E-mail" 
          className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input 
          type="password" placeholder="Hasło" 
          className="w-full p-3 mb-6 bg-slate-800 border border-slate-700 rounded-lg"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold disabled:opacity-50"
        >
          {loading ? 'Logowanie...' : 'Zaloguj się'}
        </button>
      </div>
    </div>
  )
}