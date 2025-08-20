import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export default function Weather() {
  const [coords, setCoords] = useState<{lat:number, lon:number} | null>(null)
  useEffect(()=>{
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setCoords({ lat: 28.6139, lon: 77.2090 }) // fallback New Delhi
    )
  },[])

  const forecast = useQuery({
    queryKey: ['forecast', coords?.lat, coords?.lon],
    queryFn: async () => (await axios.get(`${API_BASE}/api/weather`, { params: coords! })).data,
    enabled: !!coords
  })
  const alerts = useQuery({
    queryKey: ['alerts', coords?.lat, coords?.lon],
    queryFn: async () => (await axios.get(`${API_BASE}/api/alerts`, { params: coords! })).data,
    enabled: !!coords
  })

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">7-Day Forecast</h2>
      {!coords ? <div>Getting location...</div> : null}
      {forecast.isLoading ? <div>Loading forecast...</div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forecast.data?.daily?.time?.map((d: string, idx: number) => (
            <div key={d} className="border rounded p-3">
              <div className="font-medium">{new Date(d).toDateString()}</div>
              <div className="text-sm text-gray-600">High: {forecast.data.daily.temperature_2m_max[idx]}°C · Low: {forecast.data.daily.temperature_2m_min[idx]}°C</div>
              <div className="text-sm">Precip Prob: {forecast.data.daily.precipitation_probability_max[idx]}%</div>
            </div>
          ))}
        </div>
      )}
      <div>
        <h3 className="text-xl font-medium mb-2">Climate Alerts</h3>
        {alerts.isLoading ? <div>Loading alerts...</div> : (
          <ul className="space-y-3">
            {(alerts.data?.alerts || []).length === 0 ? <li className="text-gray-600">No active alerts</li> : null}
            {alerts.data?.alerts?.map((a: any) => (
              <li key={a.id} className="border-l-4 border-red-500 bg-red-50 p-3 rounded">
                <div className="font-medium">{a.headline}</div>
                <div className="text-sm text-gray-700">{a.event} · {a.severity}</div>
                {a.description && <p className="text-sm mt-1 whitespace-pre-wrap">{a.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

