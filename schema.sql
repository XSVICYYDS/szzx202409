-- ============================================
-- 尚志中学2024届09班 D1 数据库建表语句
-- ============================================

-- 用户表（管理员）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 学生表
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT,
  enrollment_year INTEGER NOT NULL DEFAULT 2024,
  avatar TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 作品表
CREATE TABLE IF NOT EXISTS contents (
  id TEXT PRIMARY KEY,
  student_no TEXT,
  type TEXT NOT NULL, -- image/text/doc
  title TEXT,
  description TEXT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/approved/rejected
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 诗歌表
CREATE TABLE IF NOT EXISTS poems (
  id TEXT PRIMARY KEY,
  student_no TEXT,
  title TEXT,
  content TEXT,
  author TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/approved/published
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 密钥表（分段 Base64 存储）
CREATE TABLE IF NOT EXISTS secrets (
  key_name TEXT PRIMARY KEY,
  part1 TEXT,
  part2 TEXT,
  part3 TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 配置表
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- ============================================
-- 初始数据
-- ============================================

-- 管理员账号：username='szzx202409', password=SHA-256('szzx202409-salt'+'szzx202409')
INSERT INTO users (username, password_hash, role) VALUES
  ('szzx202409', 'dc7503a361eace0d7d80dec935b420bb0f8b7278b7251ec98b0fa0dbf496edf4', 'admin');

-- 48 位学生数据（学号 202409001-202409048）
INSERT INTO students (student_no, name, bio, enrollment_year, avatar) VALUES
  ('202409001', '陈烁', NULL, 2024, NULL),
  ('202409002', '郑烁', NULL, 2024, NULL),
  ('202409003', '可思诚', NULL, 2024, NULL),
  ('202409004', '蔡育希', NULL, 2024, NULL),
  ('202409005', '方志杰', NULL, 2024, NULL),
  ('202409006', '胡云航', NULL, 2024, NULL),
  ('202409007', '李伟祺', NULL, 2024, NULL),
  ('202409008', '刘书豪', NULL, 2024, NULL),
  ('202409009', '刘自然', NULL, 2024, NULL),
  ('202409010', '尹子藤', NULL, 2024, NULL),
  ('202409011', '罗天祺', NULL, 2024, NULL),
  ('202409012', '吕世良', NULL, 2024, NULL),
  ('202409013', '宋毅', NULL, 2024, NULL),
  ('202409014', '汪子瀚', NULL, 2024, NULL),
  ('202409015', '王振瑄', NULL, 2024, NULL),
  ('202409016', '翁浩然', NULL, 2024, NULL),
  ('202409017', '吴子轩', NULL, 2024, NULL),
  ('202409018', '肖景天', NULL, 2024, NULL),
  ('202409019', '徐慎', NULL, 2024, NULL),
  ('202409020', '张珏', NULL, 2024, NULL),
  ('202409021', '张天佑', NULL, 2024, NULL),
  ('202409022', '张雨泽', NULL, 2024, NULL),
  ('202409023', '郑浩宇', NULL, 2024, NULL),
  ('202409024', '郑皓哲', NULL, 2024, NULL),
  ('202409025', '周逸', NULL, 2024, NULL),
  ('202409026', '朱嘉轩', NULL, 2024, NULL),
  ('202409027', '庄皓哲', NULL, 2024, NULL),
  ('202409028', '蔡欣雅', NULL, 2024, NULL),
  ('202409029', '陈依瑶', NULL, 2024, NULL),
  ('202409030', '陈庄睿', NULL, 2024, NULL),
  ('202409031', '范欣怡', NULL, 2024, NULL),
  ('202409032', '范奕颖', NULL, 2024, NULL),
  ('202409033', '方星睿', NULL, 2024, NULL),
  ('202409034', '李梓瑶', NULL, 2024, NULL),
  ('202409035', '梁曼羲', NULL, 2024, NULL),
  ('202409036', '刘洋', NULL, 2024, NULL),
  ('202409037', '刘艺馨', NULL, 2024, NULL),
  ('202409038', '马绮羲', NULL, 2024, NULL),
  ('202409039', '秦馨媛', NULL, 2024, NULL),
  ('202409040', '汪佳川', NULL, 2024, NULL),
  ('202409041', '杨佳妮', NULL, 2024, NULL),
  ('202409042', '杨笔纤', NULL, 2024, NULL),
  ('202409043', '章煜情', NULL, 2024, NULL),
  ('202409044', '郑贻', NULL, 2024, NULL),
  ('202409045', '郑艺歆', NULL, 2024, NULL),
  ('202409046', '郑媛月', NULL, 2024, NULL),
  ('202409047', '周芷妍', NULL, 2024, NULL),
  ('202409048', '朱诗涵', NULL, 2024, NULL);

-- 课程表数据存入 config 表
INSERT INTO config (key, value) VALUES ('schedule', '{"days":["周一","周二","周三","周四","周五","周六"],"rows":[{"section":"第一节","time":"08:00-08:45","cells":["语文","数学","语文","数学","语文","数学"]},{"section":"第二节","time":"08:55-09:40","cells":["数学","语文","数学","语文","数学","语文"]},{"section":"第三节","time":"10:00-10:45","cells":["英语","英语","科学","英语","科学","英语"]},{"section":"第四节","time":"10:55-11:40","cells":["科学","科学","英语","科学","英语","科学"]},{"section":"第五节","time":"13:30-14:15","cells":["体育与健康","英语","体育与健康","音乐","劳动","校本口语"]},{"section":"第六节","time":"14:25-15:10","cells":["音乐","体育与健康","数学","语文","数学","体育与健康"]},{"section":"第七节","time":"15:20-16:05","cells":["科学","体育与健康","数学","语文","班队心理","校本口语"]}],"note":"周六为选修课日"}');
