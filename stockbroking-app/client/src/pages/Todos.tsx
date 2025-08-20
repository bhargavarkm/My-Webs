import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'

type Todo = { id: number; scope: 'daily' | 'monthly'; text: string; done: 0|1 }
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

function TodoList({ scope }: { scope: 'daily'|'monthly' }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<Todo[]>({ queryKey: ['todos', scope], queryFn: async () => (await axios.get(`${API_BASE}/api/todos`, { params: { scope } })).data })
  const [text, setText] = useState('')
  const add = useMutation({ mutationFn: async (text: string) => (await axios.post(`${API_BASE}/api/todos`, { scope, text })).data, onSuccess: ()=> qc.invalidateQueries({ queryKey: ['todos', scope] }) })
  const toggle = useMutation({ mutationFn: async (t: Todo) => (await axios.patch(`${API_BASE}/api/todos/${t.id}`, { done: !t.done })).data, onSuccess: ()=> qc.invalidateQueries({ queryKey: ['todos', scope] }) })
  const remove = useMutation({ mutationFn: async (id: number) => (await axios.delete(`${API_BASE}/api/todos/${id}`)).data, onSuccess: ()=> qc.invalidateQueries({ queryKey: ['todos', scope] }) })

  return (
    <div className="border rounded p-3">
      <h3 className="font-medium mb-2 capitalize">{scope} To-do</h3>
      <form onSubmit={e=>{e.preventDefault(); if(text.trim()) add.mutate(text.trim()); setText('')}} className="flex gap-2 mb-3">
        <input className="border rounded px-3 py-2 flex-1" placeholder={`Add ${scope} task`} value={text} onChange={e=>setText(e.target.value)} />
        <button className="px-3 py-2 bg-black text-white rounded">Add</button>
      </form>
      {isLoading ? <div>Loading...</div> : (
        <ul className="space-y-2">
          {data?.map(t => (
            <li key={t.id} className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!t.done} onChange={()=>toggle.mutate(t)} />
                <span className={t.done ? 'line-through text-gray-500' : ''}>{t.text}</span>
              </label>
              <button onClick={()=>remove.mutate(t.id)} className="text-red-600 text-sm">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Todos() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">To-dos</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <TodoList scope="daily" />
        <TodoList scope="monthly" />
      </div>
    </div>
  )
}

