import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export default function Portfolio() {
  const { data, isLoading } = useQuery<{ totalValue: number; positions: { symbol: string; price: number }[] }>({
    queryKey: ['portfolio-summary'],
    queryFn: async () => (await axios.get(`${API_BASE}/api/portfolio/summary`)).data,
  })

  const sectorData = (data?.positions || []).map((p) => ({ name: p.symbol, value: p.price }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Portfolio Overview</h2>
        <div className="text-xl">Total value: <span className="font-bold">${(data?.totalValue ?? 0).toFixed(2)}</span></div>
      </div>
      {isLoading ? <div>Loading...</div> : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded p-4">
            <h3 className="font-medium mb-2">Positions (Price)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data?.positions || []}>
                <XAxis dataKey="symbol"/>
                <YAxis/>
                <Tooltip/>
                <Line type="monotone" dataKey="price" stroke="#0ea5e9" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="border rounded p-4">
            <h3 className="font-medium mb-2">Pseudo Sector Allocation</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sectorData}>
                <XAxis dataKey="name"/>
                <YAxis/>
                <Tooltip/>
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

