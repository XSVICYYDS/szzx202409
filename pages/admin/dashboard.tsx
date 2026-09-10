import { useEffect, useState } from 'react'

export default function AdminDashboard() {
  const [students, setStudents] = useState<any[]>([])

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
      }
    }
    load()
  }, [])

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
    </div>
  )
}
