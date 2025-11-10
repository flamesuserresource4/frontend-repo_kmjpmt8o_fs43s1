import { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function useApi(url, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch(url)
      .then(r => r.json())
      .then(d => { if (mounted) setData(d) })
      .catch(e => { if (mounted) setError(e) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, loading, error }
}

function Header({ user, onSignIn }) {
  return (
    <header className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur z-10">
      <div className="flex items-center gap-2">
        <span className="text-indigo-600 font-black text-xl">UNIVO</span>
        <span className="text-xs text-gray-500">Student OS</span>
      </div>
      {!user ? (
        <button onClick={onSignIn} className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-500">Start</button>
      ) : (
        <div className="text-sm text-gray-700">Hi, {user.name} • XP {user.xp} • 🔥 {user.streak}</div>
      )}
    </header>
  )
}

function QuickAdd({ user, onAdded }) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [loading, setLoading] = useState(false)
  if (!user) return null
  const submit = async (e) => {
    e.preventDefault()
    if (!title) return
    setLoading(true)
    await fetch(`${API}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, user_id: user._id || user.id, due_date: due ? new Date(due).toISOString() : null }) })
    setTitle(''); setDue(''); setLoading(false); onAdded?.()
  }
  return (
    <form onSubmit={submit} className="p-4 border rounded-lg bg-white flex flex-col gap-3">
      <div className="font-medium">Add Task</div>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Read chapter 3" className="border rounded px-3 py-2" />
      <input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)} className="border rounded px-3 py-2" />
      <button disabled={loading} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-500 disabled:opacity-50">Add</button>
    </form>
  )
}

function MoodCheck({ user, onLogged }) {
  const [mood, setMood] = useState('neutral')
  const [note, setNote] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (!user) return
    await fetch(`${API}/moods`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user._id || user.id, mood, note }) })
    setNote(''); onLogged?.()
  }
  if (!user) return null
  return (
    <form onSubmit={submit} className="p-4 border rounded-lg bg-white flex flex-col gap-3">
      <div className="font-medium">Daily Mood</div>
      <select value={mood} onChange={e=>setMood(e.target.value)} className="border rounded px-3 py-2">
        <option>happy</option>
        <option>motivated</option>
        <option>neutral</option>
        <option>tired</option>
        <option>stressed</option>
      </select>
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note" className="border rounded px-3 py-2" />
      <button className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500">Log</button>
    </form>
  )
}

function Suggestion({ user, refreshKey }) {
  const url = useMemo(() => user ? `${API}/flamo/suggest?user_id=${user._id || user.id}` : null, [user])
  const { data } = useApi(url || '', [url, refreshKey])
  if (!user) return null
  return (
    <div className="p-4 border rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50">{data?.message || '...'}</div>
  )
}

function Tasks({ user, refreshKey, onAction }) {
  const [tasks, setTasks] = useState([])
  useEffect(() => {
    if (!user) return
    fetch(`${API}/tasks?user_id=${user._id || user.id}`)
      .then(r=>r.json()).then(setTasks)
  }, [user, refreshKey])

  const complete = async (id) => {
    await fetch(`${API}/tasks/${id}/complete`, { method: 'PATCH' })
    onAction?.()
  }
  if (!user) return null
  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="font-medium mb-2">Your Tasks</div>
      <div className="flex flex-col gap-2">
        {tasks.length === 0 ? <div className="text-sm text-gray-500">No tasks yet</div> : null}
        {tasks.map(t => (
          <div key={t._id || t.id} className="flex items-center justify-between p-2 border rounded">
            <div>
              <div className="font-medium">{t.title}</div>
              {t.due_date && <div className="text-xs text-gray-500">Due {new Date(t.due_date).toLocaleString()}</div>}
            </div>
            {t.status !== 'completed' ? (
              <button onClick={()=>complete(t._id || t.id)} className="px-2 py-1 text-xs rounded bg-emerald-600 text-white">Complete +XP</button>
            ) : <span className="text-xs text-gray-500">Completed</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Forum({ user, refreshKey }) {
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(()=>{
    fetch(`${API}/posts`).then(r=>r.json()).then(setPosts)
  }, [refreshKey])

  const create = async (e) => {
    e.preventDefault()
    if (!user) return
    await fetch(`${API}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user._id || user.id, title, content }) })
    setTitle(''); setContent('')
    const updated = await fetch(`${API}/posts`).then(r=>r.json()); setPosts(updated)
  }

  const reply = async (id, content) => {
    if (!user) return
    await fetch(`${API}/posts/${id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user._id || user.id, content }) })
    const updated = await fetch(`${API}/posts`).then(r=>r.json()); setPosts(updated)
  }

  return (
    <div className="p-4 border rounded-lg bg-white flex flex-col gap-3">
      <div className="font-medium">Community Q&A</div>
      {user && (
        <form onSubmit={create} className="flex flex-col gap-2">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Question title" className="border rounded px-3 py-2" />
          <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Describe your question..." className="border rounded px-3 py-2" />
          <button className="px-3 py-2 rounded bg-indigo-600 text-white text-sm">Post</button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {posts.map(p => (
          <div key={p._id || p.id} className="border rounded p-3">
            <div className="font-medium">{p.title}</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{p.content}</div>
            <div className="mt-2 text-xs text-gray-500">{(p.replies||[]).length} replies</div>
            {user && (
              <ReplyBox onSend={(text)=>reply(p._id || p.id, text)} />
            )}
            {(p.replies||[]).map((r, idx) => (
              <div key={idx} className="mt-2 text-sm bg-gray-50 border rounded p-2">{r.content}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ReplyBox({ onSend }) {
  const [text, setText] = useState('')
  return (
    <div className="flex gap-2 mt-2">
      <input value={text} onChange={e=>setText(e.target.value)} placeholder="Reply..." className="border rounded px-3 py-2 flex-1" />
      <button onClick={()=>{ onSend(text); setText('') }} className="px-3 py-2 rounded bg-sky-600 text-white text-sm">Send</button>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const signIn = async () => {
    const name = prompt('Your name?') || 'Student'
    const email = `${Math.random().toString(36).slice(2,8)}@student.univo`
    const u = await fetch(`${API}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email }) }).then(r=>r.json())
    setUser(u)
  }

  const poke = () => setRefreshKey(k=>k+1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-indigo-50">
      <Header user={user} onSignIn={signIn} />
      <main className="max-w-5xl mx-auto p-6 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-6">
          <Suggestion user={user} refreshKey={refreshKey} />
          <Tasks user={user} refreshKey={refreshKey} onAction={poke} />
          <Forum user={user} refreshKey={refreshKey} />
        </div>
        <div className="flex flex-col gap-6">
          <QuickAdd user={user} onAdded={poke} />
          <MoodCheck user={user} onLogged={poke} />
          <div className="p-4 border rounded-lg bg-white">
            <div className="font-medium">How it works</div>
            <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
              <li>Add tasks and set due dates.</li>
              <li>Complete tasks to earn XP and build streaks.</li>
              <li>Log your mood daily for smart suggestions.</li>
              <li>Ask and answer questions in the community.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
