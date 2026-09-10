import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function StudentPage() {
  const router = useRouter()
  const { student_no } = router.query
  const [student, setStudent] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!student_no) return
    async function load() {
      const res = await fetch(`/api/students/${student_no}`)
      if (res.ok) {
        setStudent(await res.json())
      }
    }
    load()
  }, [student_no])

  async function handleSubmit(e: any) {
    e.preventDefault()
    setSubmitting(true)
    const token = localStorage.getItem('token')
    const res = await fetch('/api/poems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, content, studentNo: student_no }),
    })
    setSubmitting(false)
    if (res.ok) {
      alert('已提交，等待管理员审核')
      setTitle('')
      setContent('')
    } else {
      const data = await res.json()
      alert('提交失败: ' + (data?.error || data?.message || 'unknown'))
    }
  }

  if (!student) return <div className="p-8">加载中...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{student.name} 的主页</h1>
      <div className="mt-4">学号：{student.studentNo}</div>
      <div className="mt-4">简介：{student.bio ?? '暂无'}</div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold">诗歌</h2>
        {student.poems && student.poems.length > 0 ? (
          student.poems.map((p: any) => (
            <div key={p.id} className="border p-3 my-2 rounded">
              <div className="font-medium">{p.title} {p.status !== 'published' && <span className="text-sm text-yellow-600">（{p.status}）</span>}</div>
              <pre className="whitespace-pre-wrap">{p.content}</pre>
            </div>
          ))
        ) : (
          <div className="text-gray-600">暂无诗歌，稍后将上传</div>
        )}
      </div>

      {/* Submission form - only visible if student is logged in as this student */}
      <div className="mt-8 max-w-xl">
        <h2 className="text-lg font-semibold mb-2">提交新诗（提交后需管理员审核）</h2>
        <form onSubmit={handleSubmit}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="诗歌标题" className="w-full border p-2 mb-2" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="在此输入诗歌内容" className="w-full border p-2 mb-2 h-40" />
          <button disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded">{submitting ? '提交中...' : '提交诗歌'}</button>
        </form>
      </div>
    </div>
  )
}
