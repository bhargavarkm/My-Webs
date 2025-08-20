import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'

type Stock = { symbol: string; name?: string; sector?: string }

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export default function Stocks() {
  const qc = useQueryClient()
  const [symbol, setSymbol] = useState('')
  const { data, isLoading } = useQuery<Stock[]>({
    queryKey: ['stocks'],
    queryFn: async () => (await axios.get(`${API_BASE}/api/stocks`)).data,
  })

  const addMutation = useMutation({
    mutationFn: async (payload: Stock) => (await axios.post(`${API_BASE}/api/stocks`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocks'] })
  })

  const deleteMutation = useMutation({
    mutationFn: async (sym: string) => (await axios.delete(`${API_BASE}/api/stocks/${encodeURIComponent(sym)}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocks'] })
  })

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">My Stocks</h2>
      <form onSubmit={(e)=>{e.preventDefault(); if(symbol.trim()) addMutation.mutate({ symbol: symbol.trim().toUpperCase() }); setSymbol('')}} className="flex gap-2">
        <input className="border rounded px-3 py-2 flex-1" placeholder="Add symbol e.g., TCS, INFY, AAPL" value={symbol} onChange={e=>setSymbol(e.target.value)} />
        <button className="px-4 py-2 bg-black text-white rounded">Add</button>
      </form>
      {isLoading ? <div>Loading...</div> : (
        <ul className="divide-y">
          {data?.map(s => (
            <li key={s.symbol} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{s.symbol}</div>
                {s.name && <div className="text-sm text-gray-500">{s.name}</div>}
              </div>
              <button onClick={()=>deleteMutation.mutate(s.symbol)} className="text-red-600 hover:underline">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

