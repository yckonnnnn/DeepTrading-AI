import pool from '../db/pool.js';

let announcementsTableEnsured = false;
let announcementsSeedEnsured = false;

const ensureAnnouncementsTable = async () => {
  if (announcementsTableEnsured) return;
  // 表结构由 server/db/schema.js 统一创建，这里不再重复建表。
  announcementsTableEnsured = true;
};

const ensureAnnouncementsSeeded = async () => {
  if (announcementsSeedEnsured) return;
  await ensureAnnouncementsTable();
  const [rows] = await pool.execute('SELECT COUNT(1) AS cnt FROM announcements');
  const cnt = Array.isArray(rows) && rows.length > 0 ? Number(rows[0]?.cnt || 0) : 0;
  if (cnt > 0) {
    announcementsSeedEnsured = true;
    return;
  }

  const seed = [
    {
      title: '新模型上线: DeepTrading AI 2.5 Pro',
      category: 'new',
      content:
        '我们很高兴地宣布，分析引擎已全面升级至 DeepTrading AI 2.5 Pro。新模型在处理复杂金融逻辑时，响应速度提升了 30%，准确率提升了 15%。现在您可以尝试上传更复杂的 K 线图进行测试。'
    },
    {
      title: '美股实时数据源维护通知',
      category: 'maintenance',
      content:
        '为了提供更稳定的服务，我们将于今晚 02:00 - 04:00 对美股数据源进行例行维护。维护期间，实时行情可能会有短暂延迟，历史分析功能不受影响。'
    },
    {
      title: '趋势跟踪策略算法优化完成',
      category: 'update',
      content:
        '针对近期震荡市行情，我们优化了「趋势跟踪策略」的入场判定逻辑，减少了假突破信号的干扰。建议您重新运行之前的分析以获取最新建议。'
    },
    {
      title: '用户中心界面升级',
      category: 'new',
      content:
        '用户中心 UI 已焕新升级，新增了订阅管理和发票下载功能。现在您可以更方便地查看您的会员权益和历史账单。'
    },
    {
      title: '关于防范金融诈骗的提醒',
      category: 'security',
      content:
        '近期发现有不法分子冒充官方客服进行诈骗。请注意，我们不会以任何理由要求您私下转账。所有订阅请务必在官网完成。'
    }
  ];

  for (const item of seed) {
    await pool.execute(
      'INSERT INTO announcements (title, category, content, created_by) VALUES (?, ?, ?, ?)',
      [item.title, item.category, item.content, 'system']
    );
  }

  announcementsSeedEnsured = true;
};

export { ensureAnnouncementsSeeded, ensureAnnouncementsTable };
