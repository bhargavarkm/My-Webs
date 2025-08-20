import './App.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Suspense, lazy } from 'react'

const Stocks = lazy(() => import('./pages/Stocks'))
const News = lazy(() => import('./pages/News'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const Weather = lazy(() => import('./pages/Weather'))
const Todos = lazy(() => import('./pages/Todos'))
const Games = lazy(() => import('./pages/Games'))
const Penny = lazy(() => import('./pages/Penny'))

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 overflow-x-auto">
              <div className="text-xl font-semibold">Stock Dashboard</div>
              <nav className="flex gap-3 text-sm">
                <NavLink to="/" end className={({isActive})=>`px-3 py-1 rounded ${isActive? 'bg-black text-white':'hover:bg-gray-100'}`}>Portfolio</NavLink>
                <NavLink to="/stocks" className={({isActive})=>`px-3 py-1 rounded ${isActive? 'bg-black text-white':'hover:bg-gray-100'}`}>Stocks</NavLink>
                <NavLink to="/news" className={({isActive})=>`px-3 py-1 rounded ${isActive? 'bg-black text-white':'hover:bg-gray-100'}`}>News</NavLink>
                <NavLink to="/weather" className={({isActive})=>`px-3 py-1 rounded ${isActive? 'bg-black text-white':'hover:bg-gray-100'}`}>Weather</NavLink>
                <NavLink to="/penny" className={({isActive})=>`px-3 py-1 rounded ${isActive? 'bg-black text-white':'hover:bg-gray-100'}`}>Penny</NavLink>
                <NavLink to="/todos" className={({isActive})=>`px-3 py-1 rounded ${isActive? 'bg-black text-white':'hover:bg-gray-100'}`}>To-dos</NavLink>
                <NavLink to="/games" className={({isActive})=>`px-3 py-1 rounded ${isActive? 'bg-black text-white':'hover:bg-gray-100'}`}>Games</NavLink>
              </nav>
            </div>
          </header>
          <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1">
            <Suspense fallback={<div>Loading...</div>}>
              <Routes>
                <Route path="/" element={<Portfolio/>} />
                <Route path="/stocks" element={<Stocks/>} />
                <Route path="/news" element={<News/>} />
                <Route path="/weather" element={<Weather/>} />
                <Route path="/todos" element={<Todos/>} />
                <Route path="/games" element={<Games/>} />
                <Route path="/penny" element={<Penny/>} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
