import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

type Penny = { symbol: string; price: number; changePct: number; volume: number }
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export default function Penny(){
  const { data, isLoading } = useQuery<{ items: Penny[] }>({
    queryKey: ['penny-stocks'],
    queryFn: async () => (await axios.get(`${API_BASE}/api/penny-stocks`)).data,
  })
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Top 10 Penny Stocks</h2>
      <p className="text-sm text-gray-600">Price ≤ $5, ranked by intraday % change with volume filter.</p>
      {isLoading ? <div>Loading...</div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border">Symbol</th>
                <th className="text-right p-2 border">Price</th>
                <th className="text-right p-2 border">Change %</th>
                <th className="text-right p-2 border">Volume</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((p) => (
                <tr key={p.symbol}>
                  <td className="p-2 border font-medium">{p.symbol}</td>
                  <td className="p-2 border text-right">${p.price.toFixed(2)}</td>
                  <td className={`p-2 border text-right ${p.changePct>=0?'text-green-600':'text-red-600'}`}>{p.changePct.toFixed(2)}%</td>
                  <td className="p-2 border text-right">{p.volume.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

