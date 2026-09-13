import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function StudentChangePassword() {
  const router = useRouter()
  const { studentNo } = router.query
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // ensure we have a token; otherwise redirect to login
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
    }
  }, [])

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      alert('两次输入的新密码不一致')
      return
    }
    setLoading(true)
    const token = localStorage.getItem('token')
    const res = await fetch('/api/student/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setLoading(false)
    if (res.ok) {
      alert('密码已更新')
      // redirect to student page
      router.push(`/student/${studentNo}`)
    } else {
      const data = await res.json()
      alert('修改失败：' + (data?.error || data?.message || '未知错误'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">首次登录 - 修改密码</h1>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2">当前密码</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full border p-2 mb-4" />

          <label className="block mb-2">新密码</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border p-2 mb-4" />

          <label className="block mb-2">确认新密码</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border p-2 mb-4" />

          <button className="w-full bg-blue-600 text-white p-2 rounded" disabled={loading}>{loading ? '处理中...' : '修改密码并继续'}</button>
        </form>
        <div className="mt-4 text-sm text-gray-600">如果这是您第一次登录，请使用初始密码后四位登录并在此处修改。</div>
      </div>
    </div>
  )
}
