import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function StudentPage() {
  const router = useRouter()
  const { student_no } = router.query
  const [student, setStudent] = useState<any>(null)

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
              <div className="font-medium">{p.title}</div>
              <pre className="whitespace-pre-wrap">{p.content}</pre>
            </div>
          ))
        ) : (
          <div className="text-gray-600">暂无诗歌，稍后将上传</div>
        )}
      </div>
    </div>
  )
}
