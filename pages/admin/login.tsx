import { useState } from 'react'
import { useRouter } from 'next/router'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  async function handleSubmit(e: any) {
    e.preventDefault()
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('token', data.token)
      router.push('/admin/dashboard')
    } else {
      alert('管理员登录失败')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">管理员登录</h1>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2">用户名</label>
          <input value={username} onChange={e => setUsername(e.target.value)} className="w-full border p-2 mb-4" />
          <label className="block mb-2">密码</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border p-2 mb-4" />
          <button className="w-full bg-green-600 text-white p-2 rounded">登录</button>
        </form>
      </div>
    </div>
  )
}
