import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo } from 'react'

type Stock = { symbol: string }
type NewsItem = { symbol: string; title: string; link: string; pubDate?: string; description?: string }
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export default function News() {
  const stocksQuery = useQuery<Stock[]>({ queryKey: ['stocks'], queryFn: async () => (await axios.get(`${API_BASE}/api/stocks`)).data })
  const symbols = useMemo(()=> (stocksQuery.data?.map(s=>s.symbol).join(',') || 'RELIANCE,TCS,INFY'), [stocksQuery.data])
  const { data, isLoading } = useQuery<{ items: NewsItem[]}>({
    queryKey: ['news', symbols],
    queryFn: async () => (await axios.get(`${API_BASE}/api/news`, { params: { symbols } })).data,
    enabled: !!symbols
  })
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Critical News</h2>
      {isLoading ? <div>Loading...</div> : (
        <ul className="space-y-3">
          {data?.items?.map((n, idx) => (
            <li key={idx} className="border rounded p-3">
              <div className="text-xs text-gray-500">{n.symbol} {n.pubDate ? `· ${new Date(n.pubDate).toLocaleString()}`:''}</div>
              <a href={n.link} target="_blank" className="font-medium hover:underline">{n.title}</a>
              {n.description && <p className="text-sm mt-1 text-gray-700" dangerouslySetInnerHTML={{__html: n.description}} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

