import { useState } from 'react'
import { useRouter } from 'next/router'

export default function LoginPage() {
  const [studentNo, setStudentNo] = useState('')
  const router = useRouter()

  async function handleLogin(e: any) {
    e.preventDefault()
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentNo }),
    })
    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('token', data.token)
      router.push(`/student/${studentNo}`)
    } else {
      alert('登录失败，请确认学号是否正确')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">尚志中学 2024 届 09 班</h1>
        <form onSubmit={handleLogin}>
          <label className="block mb-2">学号</label>
          <input value={studentNo} onChange={e => setStudentNo(e.target.value)} className="w-full border p-2 mb-4" />
          <button className="w-full bg-blue-600 text-white p-2 rounded">登录</button>
        </form>
        <div className="mt-4 text-sm text-gray-600">管理员入口：<a href="/admin/login" className="text-blue-600">管理员登录</a></div>
      </div>
    </div>
  )
}
