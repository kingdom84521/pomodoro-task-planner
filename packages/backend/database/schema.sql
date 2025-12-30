-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 资源分群表
CREATE TABLE IF NOT EXISTS resource_groups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  percentage_limit INTEGER NOT NULL CHECK (percentage_limit >= 0 AND percentage_limit <= 100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT '待處理',
  resource_group_id INTEGER REFERENCES resource_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('待處理', '進行中', '擱置中', '已完成', '已交接', '已封存', '已取消'))
);

-- 工作紀錄表（番茄鐘完成記錄）
CREATE TABLE IF NOT EXISTS work_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  task_name VARCHAR(500) NOT NULL,
  duration INTEGER NOT NULL,  -- 耗時（秒）
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_resource_group_id ON tasks(resource_group_id);
CREATE INDEX IF NOT EXISTS idx_resource_groups_user_id ON resource_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_work_records_user_id ON work_records(user_id);
CREATE INDEX IF NOT EXISTS idx_work_records_completed_at ON work_records(completed_at);

-- 插入 5 个 Mock 用户
INSERT INTO users (username, email) VALUES
  ('Mock User 1', 'mock1@example.com'),
  ('Mock User 2', 'mock2@example.com'),
  ('Mock User 3', 'mock3@example.com'),
  ('Mock User 4', 'mock4@example.com'),
  ('Mock User 5', 'mock5@example.com')
ON CONFLICT (username) DO NOTHING;
