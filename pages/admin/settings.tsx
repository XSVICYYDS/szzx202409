import { useState } from 'react'
import { useRouter } from 'next/router'

export default function AdminSettings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      alert('两次输入的新密码不一致')
      return
    }
    setLoading(true)
    const token = localStorage.getItem('token')
    const res = await fetch('/api/admin/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setLoading(false)
    if (res.ok) {
      alert('密码修改成功，请使用新密码重新登录')
      // logout
      localStorage.removeItem('token')
      router.push('/admin/login')
    } else {
      const data = await res.json()
      alert('修改失败：' + (data?.error || data?.message || '未知错误'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">管理员设置</h1>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2">当前密码</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full border p-2 mb-4" />

          <label className="block mb-2">新密码</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border p-2 mb-4" />

          <label className="block mb-2">确认新密码</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border p-2 mb-4" />

          <button className="w-full bg-blue-600 text-white p-2 rounded" disabled={loading}>{loading ? '处理中...' : '修改密码'}</button>
        </form>
        <div className="mt-4 text-sm text-gray-600">注意：修改后将登出，请使用新密码重新登录。</div>
      </div>
    </div>
  )
}
