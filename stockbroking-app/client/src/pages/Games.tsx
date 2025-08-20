import { useState } from 'react'

function Dice() {
  const [value, setValue] = useState(1)
  return (
    <div className="border rounded p-3">
      <h3 className="font-medium mb-2">Roll the Dice</h3>
      <div className="text-4xl mb-2">{value}</div>
      <button className="px-3 py-2 bg-black text-white rounded" onClick={()=> setValue(1 + Math.floor(Math.random()*6))}>Roll</button>
    </div>
  )
}

function MinesweeperMini() {
  const size = 6
  const bombCount = 5
  const [bombs] = useState(()=>{
    const set = new Set<number>()
    while (set.size < bombCount) set.add(Math.floor(Math.random() * size * size))
    return set
  })
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [lost, setLost] = useState(false)
  const neighbors = (i:number) => {
    const x = i % size, y = Math.floor(i / size)
    const deltas = [-1,0,1]
    let count = 0
    for (const dx of deltas) for (const dy of deltas) {
      if (dx===0 && dy===0) continue
      const nx = x+dx, ny = y+dy
      if (nx<0||ny<0||nx>=size||ny>=size) continue
      if (bombs.has(ny*size+nx)) count++
    }
    return count
  }
  const onClick = (i:number) => {
    if (lost || revealed.has(i)) return
    if (bombs.has(i)) { setLost(true); return }
    const next = new Set(revealed)
    next.add(i)
    setRevealed(next)
  }
  return (
    <div className="border rounded p-3">
      <h3 className="font-medium mb-2">Minesweeper (mini)</h3>
      <div className="grid grid-cols-6 gap-1">
        {Array.from({length: size*size}).map((_,i)=>{
          const isRevealed = revealed.has(i)
          const content = isRevealed ? neighbors(i) : ''
          return (
            <button key={i} onClick={()=>onClick(i)} className={`w-10 h-10 border rounded ${isRevealed? 'bg-white':'bg-gray-200'}`}>
              {content}
            </button>
          )
        })}
      </div>
      {lost && <div className="mt-2 text-red-600">Boom! You hit a mine.</div>}
    </div>
  )
}

export default function Games(){
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Arcade</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Dice/>
        <MinesweeperMini/>
      </div>
    </div>
  )
}

