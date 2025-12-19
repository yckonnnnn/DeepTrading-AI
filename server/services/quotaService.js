import crypto from 'crypto';

import pool from '../db/pool.js';

const getActiveSubscriptionForUser = async (userId) => {
  if (!userId) return null;
  const [rows] = await pool.execute(
    `SELECT id, user_id, status, plan_code, plan_name, started_at, current_period_start, current_period_end, canceled_at, ended_at, provider, provider_subscription_id, provider_order_id, price_amount, price_currency, created_at, updated_at
     FROM user_subscriptions
     WHERE user_id = ?
       AND status = 'active'
       AND current_period_end > NOW()
     ORDER BY current_period_end DESC
     LIMIT 1`,
    [userId]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
};

const getTierForUser = async (userRow) => {
  if (!userRow) return 'free';
  if (userRow.channel === 1) return 'admin';
  const sub = await getActiveSubscriptionForUser(userRow.user_id);
  if (sub && ['weekly', 'monthly', 'yearly', 'custom'].includes(sub.plan_code)) return 'pro';
  return 'free';
};

const getProQuotaLimitByPlanCode = (planCode) => {
  if (planCode === 'weekly') return 30;
  if (planCode === 'monthly') return 150;
  if (planCode === 'yearly') return 999999999;
  return 150;
};

const ensureFreeGrantAfterProExpired = async (userId) => {
  if (!userId) return;
  const [rows] = await pool.execute(
    `SELECT id, plan_code, current_period_end
     FROM user_subscriptions
     WHERE user_id = ?
       AND plan_code IN ('weekly','monthly','yearly','custom')
       AND current_period_end <= NOW()
     ORDER BY current_period_end DESC
     LIMIT 1`,
    [userId]
  );
  if (!Array.isArray(rows) || rows.length === 0) return;

  const endedAt = rows[0]?.current_period_end;
  if (!endedAt) return;

  const periodEnd = '2099-01-01 00:00:00';
  await pool.execute(
    `INSERT IGNORE INTO user_quota_periods
      (user_id, tier, grant_reason, period_type, period_start, period_end, quota_limit, used_count_success, reserved_count_success, used_count_total)
     VALUES (?, 'free', 'pro_expired_bonus', 'lifetime', ?, ?, 2, 0, 0, 0)`,
    [userId, new Date(endedAt), periodEnd]
  );
};

const ensureAdminShadowQuotaPeriod = async (userId) => {
  if (!userId) return null;
  await pool.execute(
    `INSERT IGNORE INTO user_quota_periods
      (user_id, tier, grant_reason, period_type, period_start, period_end, quota_limit, used_count_success, reserved_count_success, used_count_total)
     VALUES (?, 'pro', 'admin_shadow', 'lifetime', NOW(), '2099-01-01 00:00:00', 999999999, 0, 0, 0)`,
    [userId]
  );
  const [rows] = await pool.execute(
    `SELECT id, quota_limit
     FROM user_quota_periods
     WHERE user_id = ?
       AND tier = 'pro'
       AND period_type = 'lifetime'
       AND grant_reason = 'admin_shadow'
     ORDER BY period_start DESC
     LIMIT 1`,
    [userId]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
};

const ensureFreeRegisterGrant = async (userId) => {
  if (!userId) return;
  const [rows] = await pool.execute(
    `SELECT id
     FROM user_quota_periods
     WHERE user_id = ?
       AND tier = 'free'
       AND period_type = 'lifetime'
       AND grant_reason = 'register'
     LIMIT 1`,
    [userId]
  );
  if (Array.isArray(rows) && rows.length > 0) return;
  await pool.execute(
    `INSERT IGNORE INTO user_quota_periods
      (user_id, tier, grant_reason, period_type, period_start, period_end, quota_limit, used_count_success, reserved_count_success, used_count_total)
     VALUES (?, 'free', 'register', 'lifetime', NOW(), '2099-01-01 00:00:00', 2, 0, 0, 0)`,
    [userId]
  );
};

const ensureProQuotaPeriod = async (userId, subscription) => {
  if (!userId || !subscription) return null;
  const periodType = subscription.plan_code === 'weekly' ? 'weekly' : subscription.plan_code === 'yearly' ? 'yearly' : 'monthly';
  const quotaLimit = getProQuotaLimitByPlanCode(subscription.plan_code);
  await pool.execute(
    `INSERT IGNORE INTO user_quota_periods
      (user_id, tier, grant_reason, period_type, period_start, period_end, quota_limit, used_count_success, reserved_count_success, used_count_total)
     VALUES (?, 'pro', 'subscription', ?, ?, ?, ?, 0, 0, 0)`,
    [
      userId,
      periodType,
      new Date(subscription.current_period_start),
      new Date(subscription.current_period_end),
      quotaLimit
    ]
  );
  const [rows] = await pool.execute(
    `SELECT id, quota_limit, used_count_success, reserved_count_success, used_count_total, period_start, period_end
     FROM user_quota_periods
     WHERE user_id = ? AND tier = 'pro' AND period_type = ? AND period_start = ? AND period_end = ?
     LIMIT 1`,
    [
      userId,
      periodType,
      new Date(subscription.current_period_start),
      new Date(subscription.current_period_end)
    ]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0];
  if (subscription.plan_code === 'yearly' && (row.quota_limit === null || row.quota_limit === undefined)) {
    await pool.execute('UPDATE user_quota_periods SET quota_limit = ? WHERE id = ? AND quota_limit IS NULL', [quotaLimit, row.id]);
    row.quota_limit = quotaLimit;
  }
  return row;
};

const reserveQuotaForAttempt = async ({ userId, tier, subscription, reportType }) => {
  if (!userId) {
    return { ok: false, status: 401, payload: { error: '未登录', code: 'UNAUTHORIZED' } };
  }

  if (tier === 'admin') {
    const qp = await ensureAdminShadowQuotaPeriod(userId);
    const attemptId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    if (qp?.id) {
      await pool.execute(
        `UPDATE user_quota_periods SET used_count_total = used_count_total + 1, last_used_at = NOW() WHERE id = ?`,
        [qp.id]
      );
    }
    await pool.execute(
      `INSERT INTO analysis_attempts (attempt_id, user_id, report_type, quota_period_id, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [attemptId, userId, reportType, qp?.id ?? null]
    );
    return { ok: true, attemptId, quotaPeriodId: qp?.id ?? null, quotaLimit: qp?.quota_limit == null ? null : Number(qp.quota_limit), reserved: false };
  }

  if (tier === 'pro') {
    if (!subscription) {
      return { ok: false, status: 403, payload: { error: '订阅无效', code: 'SUBSCRIPTION_INVALID' } };
    }
    const quotaPeriod = await ensureProQuotaPeriod(userId, subscription);
    if (!quotaPeriod) {
      return { ok: false, status: 500, payload: { error: '配额初始化失败', code: 'QUOTA_INIT_FAILED' } };
    }

    const attemptId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    if (quotaPeriod.quota_limit == null) {
      await pool.execute(
        `UPDATE user_quota_periods SET used_count_total = used_count_total + 1, last_used_at = NOW() WHERE id = ?`,
        [quotaPeriod.id]
      );
      await pool.execute(
        `INSERT INTO analysis_attempts (attempt_id, user_id, report_type, quota_period_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [attemptId, userId, reportType, quotaPeriod.id]
      );
      return { ok: true, attemptId, quotaPeriodId: quotaPeriod.id, quotaLimit: null, reserved: false };
    }

    const [result] = await pool.execute(
      `UPDATE user_quota_periods
       SET reserved_count_success = reserved_count_success + 1,
           used_count_total = used_count_total + 1,
           last_used_at = NOW()
       WHERE id = ?
         AND (used_count_success + reserved_count_success) < quota_limit`,
      [quotaPeriod.id]
    );
    if (!result || result.affectedRows !== 1) {
      return { ok: false, status: 403, payload: { error: '余额不足', code: 'QUOTA_EXCEEDED' } };
    }

    await pool.execute(
      `INSERT INTO analysis_attempts (attempt_id, user_id, report_type, quota_period_id, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [attemptId, userId, reportType, quotaPeriod.id]
    );
    return { ok: true, attemptId, quotaPeriodId: quotaPeriod.id, quotaLimit: quotaPeriod.quota_limit, reserved: true };
  }

  await ensureFreeGrantAfterProExpired(userId);

  const [freeRows] = await pool.execute(
    `SELECT id, quota_limit, used_count_success, reserved_count_success, period_start
     FROM user_quota_periods
     WHERE user_id = ?
       AND tier = 'free'
       AND period_type = 'lifetime'
       AND period_start <= NOW()
       AND period_end > NOW()
     ORDER BY period_start ASC`,
    [userId]
  );
  const periods = Array.isArray(freeRows) ? freeRows : [];
  const attemptId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  for (const p of periods) {
    if (p.quota_limit != null && (p.used_count_success + p.reserved_count_success) >= p.quota_limit) continue;
    if (p.quota_limit == null) {
      await pool.execute(
        `UPDATE user_quota_periods SET used_count_total = used_count_total + 1, last_used_at = NOW() WHERE id = ?`,
        [p.id]
      );
      await pool.execute(
        `INSERT INTO analysis_attempts (attempt_id, user_id, report_type, quota_period_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [attemptId, userId, reportType, p.id]
      );
      return { ok: true, attemptId, quotaPeriodId: p.id, quotaLimit: null, reserved: false };
    }

    const [result] = await pool.execute(
      `UPDATE user_quota_periods
       SET reserved_count_success = reserved_count_success + 1,
           used_count_total = used_count_total + 1,
           last_used_at = NOW()
       WHERE id = ?
         AND (used_count_success + reserved_count_success) < quota_limit`,
      [p.id]
    );
    if (result && result.affectedRows === 1) {
      await pool.execute(
        `INSERT INTO analysis_attempts (attempt_id, user_id, report_type, quota_period_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [attemptId, userId, reportType, p.id]
      );
      return { ok: true, attemptId, quotaPeriodId: p.id, quotaLimit: p.quota_limit, reserved: true };
    }
  }

  return { ok: false, status: 403, payload: { error: '余额不足', code: 'QUOTA_EXCEEDED' } };
};

const finalizeQuotaAttempt = async ({ attemptId, quotaPeriodId, success, reserved }) => {
  try {
    if (attemptId) {
      await pool.execute(
        `UPDATE analysis_attempts SET status = ?, ended_at = NOW() WHERE attempt_id = ?`,
        [success ? 'success' : 'failed', attemptId]
      );
    }
    if (!quotaPeriodId) return;
    if (success) {
      if (reserved) {
        await pool.execute(
          `UPDATE user_quota_periods
           SET reserved_count_success = IF(reserved_count_success > 0, reserved_count_success - 1, 0),
               used_count_success = used_count_success + 1,
               last_used_at = NOW()
           WHERE id = ?`,
          [quotaPeriodId]
        );
      } else {
        await pool.execute(
          `UPDATE user_quota_periods
           SET used_count_success = used_count_success + 1,
               last_used_at = NOW()
           WHERE id = ?`,
          [quotaPeriodId]
        );
      }
      return;
    }

    if (reserved) {
      await pool.execute(
        `UPDATE user_quota_periods
         SET reserved_count_success = IF(reserved_count_success > 0, reserved_count_success - 1, 0),
             last_used_at = NOW()
         WHERE id = ?`,
        [quotaPeriodId]
      );
    }
  } catch (e) {
    console.error('❌ finalize quota attempt failed:', e);
  }
};

export {
  ensureAdminShadowQuotaPeriod,
  ensureFreeGrantAfterProExpired,
  ensureFreeRegisterGrant,
  ensureProQuotaPeriod,
  finalizeQuotaAttempt,
  getActiveSubscriptionForUser,
  getTierForUser,
  reserveQuotaForAttempt
};
