'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'


export default function Home() {
  const [view, setView] = useState<'matches' | 'ranking'>('matches')
  const [matches, setMatches] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any>({})
  const [ranking, setRanking] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [matchStats, setMatchStats] = useState<any>({})

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)

      const { data: mData } = await supabase.from('mecze').select('*').order('data_meczu', { ascending: true })
      setMatches(mData || [])

      const { data: pData } = await supabase.from('typy').select('*').eq('user_id', user.id)
      const predMap: any = {}
      pData?.forEach(p => { predMap[p.match_id] = p })
      pData?.forEach(p => {
      fetchStats(p.match_id)})
      setPredictions(predMap)

      const { data: rData } = await supabase.from('profiles').select('username, punkty').order('punkty', { ascending: false })
      setRanking(rData || [])
      
      setLoading(false)
    }
    getData()
  }, [view])

const fetchStats = async (matchId: string) => {
  const { data: allPredictions } = await supabase
    .from('typy')
    .select('typ_a, typ_b')
    .eq('match_id', matchId)

  if (allPredictions) {
    const total = allPredictions.length
    const stats: any = { total, scores: {} }
    
    allPredictions.forEach(p => {
      const scoreKey = `${p.typ_a}:${p.typ_b}`
      stats.scores[scoreKey] = (stats.scores[scoreKey] || 0) + 1
    })
    
    // Sortowanie wyników od najczęstszych
    const sortedScores = Object.entries(stats.scores)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 3) // bierzemy 3 najpopularniejsze

    setMatchStats((prev: any) => ({ 
      ...prev, 
      [matchId]: { total, topScores: sortedScores } 
    }))
  }
}

  const handleSave = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId)
    const matchTime = new Date(match.data_meczu).getTime()
    const now = new Date().getTime()
    if (now > (matchTime - 3 * 60 * 60 * 1000)) {
      alert("Czas minął! Blokada 3h przed meczem.")
      return
    }

    const typ_a = (document.getElementById(`a-${matchId}`) as HTMLInputElement).value
    const typ_b = (document.getElementById(`b-${matchId}`) as HTMLInputElement).value

    const { error } = await supabase.from('typy').upsert({
      user_id: user.id,
      match_id: matchId,
      typ_a: parseInt(typ_a),
      typ_b: parseInt(typ_b)
    }, { onConflict: 'user_id,match_id' })

    if (error) alert(error.message)
    else { alert("Typ zapisany!"); window.location.reload(); }
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-bold text-2xl animate-pulse">Ładowanie danych...</div>

  return (
    <main className="p-4 md:p-12 bg-slate-950 min-h-screen text-white font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* NAGŁÓWEK */}
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 uppercase italic tracking-tighter">
            Mundial 2026
          </h1>
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            className="text-slate-500 hover:text-white text-sm font-bold uppercase tracking-widest transition"
          >
            Wyloguj
          </button>
          {user?.email === 'emil.pawelec@domar.waw.pl' && (
          <button 
            onClick={() => window.location.href = '/admin'}
            className="mr-4 text-red-500 hover:text-red-400 text-sm font-black uppercase tracking-widest border border-red-500/30 px-3 py-1 rounded-lg transition"
          >
            Panel Admina
          </button>
        )}
        </header>
        
        {/* NAWIGACJA XL */}
        <nav className="flex gap-6 mb-12 bg-slate-900/50 p-3 rounded-[2rem] border border-slate-800 shadow-2xl">
          <button 
            onClick={() => setView('matches')}
            className={`flex-1 py-5 rounded-[1.5rem] text-xl font-black transition-all ${view === 'matches' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            MECZE
          </button>
          <button 
            onClick={() => setView('ranking')}
            className={`flex-1 py-5 rounded-[1.5rem] text-xl font-black transition-all ${view === 'ranking' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            RANKING
          </button>
        </nav>

        {/* WIDOK MECZÓW XL */}
        {view === 'matches' && (
          <div className="space-y-10">
            {matches.map((match) => {
              const myPred = predictions[match.id]
              const isLocked = new Date().getTime() > (new Date(match.data_meczu).getTime() - 3 * 60 * 60 * 1000)
              return (
                <div key={match.id} className="bg-slate-900 border-2 border-slate-800 p-8 md:p-12 rounded-[3rem] shadow-3xl hover:border-blue-500/30 transition-all group">
                   
                   {/* Data i Godzina - WIĘKSZA */}
                   <div className="flex justify-center mb-10">
                      <span className="bg-blue-600/10 text-blue-400 px-6 py-2 rounded-full text-sm md:text-base font-black tracking-widest border border-blue-500/20 uppercase">
                        {new Date(match.data_meczu).toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </span>
                   </div>

                   <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
                      {/* Drużyna A */}
                      <div className="flex-1 text-center md:text-right text-3xl md:text-4xl font-black tracking-tight group-hover:text-blue-400 transition-colors">
                        {match.druzyna_a}
                      </div>

                      {/* Wynik / Inputy XL */}
                      <div className="flex items-center gap-4">
                        <input 
                          id={`a-${match.id}`} 
                          type="number" 
                          disabled={isLocked || !!myPred} 
                          defaultValue={myPred?.typ_a} 
                          className="w-24 h-24 md:w-28 md:h-28 bg-slate-950 border-2 border-slate-700 rounded-[1.5rem] text-center text-4xl md:text-5xl font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50 disabled:bg-slate-900"
                          placeholder="-"
                        />
                        <span className="text-4xl font-black text-slate-700">:</span>
                        <input 
                          id={`b-${match.id}`} 
                          type="number" 
                          disabled={isLocked || !!myPred} 
                          defaultValue={myPred?.typ_b} 
                          className="w-24 h-24 md:w-28 md:h-28 bg-slate-950 border-2 border-slate-700 rounded-[1.5rem] text-center text-4xl md:text-5xl font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50 disabled:bg-slate-900"
                          placeholder="-"
                        />
                      </div>

                      {/* Drużyna B */}
                      <div className="flex-1 text-center md:text-left text-3xl md:text-4xl font-black tracking-tight group-hover:text-blue-400 transition-colors">
                        {match.druzyna_b}
                      </div>
                   </div>

                   {/* Przycisk zapisu XL */}
                   {!myPred && !isLocked && (
                     <button 
                        onClick={() => handleSave(match.id)} 
                        className="w-full mt-12 bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[2rem] text-2xl font-black shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        ZATWIERDŹ WYNIK
                      </button>
                   )}

                   {myPred && (
                     <div className="mt-10 text-center text-slate-500 font-bold uppercase tracking-widest text-sm bg-slate-950/50 py-4 rounded-2xl">
                        Twój typ został zapisany
                     </div>
                   )}
                   {myPred && matchStats[match.id] && (
  <div className="mt-8 pt-8 border-t border-slate-800/50">
    <div className="text-center mb-4">
      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        Jak typowali inni ({matchStats[match.id].total} graczy)
      </h4>
    </div>
    <div className="flex justify-center gap-4">
      {matchStats[match.id].topScores.map(([score, count]: any) => {
        const percentage = Math.round((count / matchStats[match.id].total) * 100)
        return (
          <div key={score} className="bg-slate-950 border border-slate-800 px-6 py-3 rounded-2xl text-center min-w-[100px]">
            <div className="text-xl font-black text-blue-400">{score}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
              {count} osób ({percentage}%)
            </div>
          </div>
        )
      })}
    </div>
  </div>
)}

                   {isLocked && !myPred && (
                     <div className="mt-10 text-center text-red-500 font-bold uppercase tracking-widest text-sm bg-red-500/10 py-4 rounded-2xl border border-red-500/20">
                        Typowanie zablokowane
                     </div>
                   )}
                </div>
              )
            })}
          </div>
        )}

        {/* RANKING XL */}
        {view === 'ranking' && (
          <div className="bg-slate-900 border-2 border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-800 text-slate-400 uppercase text-sm tracking-widest font-black">
                <tr>
                  <th className="p-8">POZ</th>
                  <th className="p-8">GRACZ</th>
                  <th className="p-8 text-right">PUNKTY</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((player, index) => (
                  <tr key={index} className={`border-t border-slate-800 hover:bg-blue-600/5 transition-colors ${player.username === user.email ? 'bg-blue-600/10' : ''}`}>
                    <td className="p-8 text-3xl font-black text-blue-500 italic">#{index + 1}</td>
                    <td className="p-8">
                      <div className="text-2xl font-bold">{player.username}</div>
                      {player.username === user.email && <span className="text-xs text-blue-400 font-black uppercase tracking-widest">To Ty!</span>}
                    </td>
                    <td className="p-8 text-right">
                      <span className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
                        {player.punkty}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </main>
  )
}