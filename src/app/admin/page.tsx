'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPanel() {
  const [matches, setMatches] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      // !!! TUTAJ WPISZ SWÓJ E-MAIL Z SUPABASE !!!
      if (user?.email === 'emil.pawelec@domar.waw.pl') {
        setIsAdmin(true)
        fetchMatches()
      } else {
        window.location.href = '/'
      }
      setLoading(false)
    }
    checkAdmin()
  }, [])

  const fetchMatches = async () => {
    const { data } = await supabase.from('mecze').select('*').order('data_meczu', { ascending: true })
    setMatches(data || [])
  }

  const settleMatch = async (matchId: string) => {
    const resA = (document.getElementById(`resA-${matchId}`) as HTMLInputElement).value
    const resB = (document.getElementById(`resB-${matchId}`) as HTMLInputElement).value
    
    if (resA === "" || resB === "") {
      alert("Wpisz wynik meczu!")
      return
    }

    const scoreA = parseInt(resA)
    const scoreB = parseInt(resB)

    if (!confirm(`Czy na pewno chcesz rozliczyć mecz na wynik ${scoreA}:${scoreB}? Punkty zostaną dodane graczom.`)) return

    // 1. Zaktualizuj wynik meczu
    await supabase.from('mecze').update({ wynik_a: scoreA, wynik_b: scoreB }).eq('id', matchId)

    // 2. Pobierz wszystkie typy dla tego meczu
    const { data: predictions } = await supabase.from('typy').select('*').eq('match_id', matchId)

    if (predictions) {
      for (const pred of predictions) {
        let pts = 0
        
        // --- LOGIKA PUNKTACJI 3-1-0 ---
        if (pred.typ_a === scoreA && pred.typ_b === scoreB) {
          pts = 3 // Dokładny wynik
        } else if (
          (pred.typ_a > pred.typ_b && scoreA > scoreB) || // Trafiony zwycięzca A
          (pred.typ_a < pred.typ_b && scoreA < scoreB) || // Trafiony zwycięzca B
          (pred.typ_a === pred.typ_b && scoreA === scoreB) // Trafiony remis
        ) {
          pts = 1 // Trafiony kierunek (zwycięzca lub remis)
        }

        // Zaktualizuj punkty w konkretnym typie (żeby gracz widział ile dostał za ten mecz)
        await supabase.from('typy').update({ zdobyte_pkt: pts }).eq('id', pred.id)
        
        // Zaktualizuj sumę punktów w profilu gracza
        const { data: profile } = await supabase.from('profiles').select('punkty').eq('id', pred.user_id).single()
        const nowePunkty = (profile?.punkty || 0) + pts
        await supabase.from('profiles').update({ punkty: nowePunkty }).eq('id', pred.user_id)
      }
    }

    alert("Mecz rozliczony! Ranking został zaktualizowany.")
    fetchMatches()
  }

  if (loading) return <div className="p-10 text-white">Sprawdzanie uprawnień...</div>
  if (!isAdmin) return null

  return (
    <main className="p-4 md:p-12 bg-slate-950 min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 border-b border-slate-800 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-red-500 uppercase tracking-tighter">Panel Admina</h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.3em]">Zatwierdzanie oficjalnych wyników</p>
          </div>
          <button onClick={() => window.location.href = '/'} className="bg-slate-800 px-4 py-2 rounded-lg text-xs font-bold uppercase">Powrót do Typera</button>
        </header>

        <div className="space-y-6">
          {matches.map((m) => (
            <div key={m.id} className="bg-slate-900 border-2 border-slate-800 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <div className="text-xs text-slate-500 font-black mb-2 uppercase tracking-widest">
                   {new Date(m.data_meczu).toLocaleString('pl-PL')}
                </div>
                <div className="text-2xl font-black italic underline decoration-red-500 underline-offset-8">
                  {m.druzyna_a} vs {m.druzyna_b}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <input 
                    id={`resA-${m.id}`} 
                    type="number" 
                    defaultValue={m.wynik_a}
                    className="w-20 h-20 bg-black border-2 border-slate-700 rounded-2xl text-center text-3xl font-black text-red-500 focus:border-red-500 outline-none"
                    placeholder="?"
                  />
                  <span className="text-3xl font-black self-center text-slate-700">:</span>
                  <input 
                    id={`resB-${m.id}`} 
                    type="number" 
                    defaultValue={m.wynik_b}
                    className="w-20 h-20 bg-black border-2 border-slate-700 rounded-2xl text-center text-3xl font-black text-red-500 focus:border-red-500 outline-none"
                    placeholder="?"
                  />
                </div>

                <button 
                  onClick={() => settleMatch(m.id)}
                  className="bg-red-600 hover:bg-red-500 h-20 px-8 rounded-2xl font-black text-sm uppercase shadow-lg shadow-red-900/20 transition-all active:scale-95"
                >
                  ROZLICZ
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}