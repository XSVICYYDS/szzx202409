// GET /api/data - 获取公开数据
import { json } from '../_utils.js';

export async function onRequestGet(context) {
  const { env } = context;
  const db = env.DB;

  const [configRows, students, contents, poems, scheduleRow] = await Promise.all([
    db.prepare('SELECT key, value FROM config').all(),
    db.prepare('SELECT id, student_no, name, bio, enrollment_year, avatar FROM students ORDER BY student_no').all(),
    db.prepare('SELECT * FROM contents WHERE status=? ORDER BY created_at DESC').bind('approved').all(),
    db.prepare("SELECT * FROM poems WHERE status IN ('approved','published') ORDER BY created_at DESC").all(),
    db.prepare('SELECT value FROM config WHERE key=?').bind('schedule').first(),
  ]);

  const config = {};
  if (configRows.results) {
    for (const row of configRows.results) config[row.key] = row.value;
  }

  let schedule = null;
  if (scheduleRow && scheduleRow.value) {
    try { schedule = JSON.parse(scheduleRow.value); } catch (e) { schedule = null; }
  }

  return json({
    config,
    students: students.results || [],
    contents: contents.results || [],
    poems: poems.results || [],
    schedule,
  });
}
