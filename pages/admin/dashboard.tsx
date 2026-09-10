import { useEffect, useState } from 'react'

export default function AdminDashboard() {
  const [students, setStudents] = useState<any[]>([])
  const [drafts, setDrafts] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      } else {
        // redirect to admin login
        window.location.href = '/admin/login'
        return
      }

      const dres = await fetch('/api/admin/poems', { headers: { Authorization: `Bearer ${token}` } })
      if (dres.ok) {
        const pd = await dres.json()
        setDrafts(pd)
      }
    }
    load()
  }, [])

  async function handleAction(id: number, action: 'publish' | 'reject') {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/admin/poems', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action }),
    })
    if (res.ok) {
      alert('操作成功')
      setDrafts(drafts.filter(d => d.id !== id))
    } else {
      alert('操作失败')
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">管理员面板</h1>
      <h2 className="text-lg font-semibold">学生列表（{students.length}）</h2>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
        {students.map(s => (
          <div key={s.studentNo} className="border p-3 rounded">
            <div className="font-medium">{s.name}（{s.studentNo}）</div>
            <div className="text-sm text-gray-600">{s.bio ?? '无简介'}</div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">待审核诗歌（{drafts.length}）</h2>
        {drafts.length === 0 && <div className="text-gray-600">暂无待审核的诗歌</div>}
        {drafts.map(d => (
          <div key={d.id} className="border p-3 my-2 rounded">
            <div className="font-medium">{d.title} — {d.student.name}（{d.student.studentNo}）</div>
            <pre className="whitespace-pre-wrap">{d.content}</pre>
            <div className="mt-2">
              <button onClick={() => handleAction(d.id, 'publish')} className="bg-green-600 text-white px-3 py-1 rounded mr-2">发布</button>
              <button onClick={() => handleAction(d.id, 'reject')} className="bg-red-600 text-white px-3 py-1 rounded">驳回</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
