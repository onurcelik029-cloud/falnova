// Yönetici paneli için salt-okunur toplulaştırma sorguları. Uygulamanın normal kullanıcı akışından
// tamamen ayrı: hiçbir fonksiyon burada kredi/bakiye değiştirmez, yalnızca raporlama yapar.
import type { DatabaseSync } from 'node:sqlite';

type Row = Record<string, any>;

export interface AdminStats {
  users: { total: number; registered: number; guest: number; today: number; last7d: number; last30d: number; consented: number };
  revenue: { totalTry: number; last7dTry: number; last30dTry: number; purchases: number };
  credits: { grantedTotal: number; spentTotal: number };
  fortunes: { total: number; byKind: { kind: string; count: number }[] };
  ai: { openai: boolean; gemini: boolean; elevenlabs: boolean; payments: string };
}

export interface AdminUserRow {
  id: string; email: string; name: string; sign: string; isGuest: boolean; createdAt: string;
  consented: boolean; credits: number; questions: number; purchaseCount: number; totalSpentTry: number;
}

export interface AdminTxRow {
  id: string; userId: string; userEmail: string; type: string; title: string; credits: number;
  questions: number; amountTry: number; status: string; provider: string; createdAt: string;
}

export function createAdminStore(db: DatabaseSync) {
  function stats(): AdminStats {
    const day = new Date().toISOString().slice(0, 10);
    const d7 = new Date(Date.now() - 7 * 86400000).toISOString();
    const d30 = new Date(Date.now() - 30 * 86400000).toISOString();

    const u = db.prepare(`SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN is_guest=0 THEN 1 ELSE 0 END) AS registered,
        SUM(CASE WHEN is_guest=1 THEN 1 ELSE 0 END) AS guest,
        SUM(CASE WHEN substr(created_at,1,10)=? THEN 1 ELSE 0 END) AS today,
        SUM(CASE WHEN created_at>=? THEN 1 ELSE 0 END) AS last7d,
        SUM(CASE WHEN created_at>=? THEN 1 ELSE 0 END) AS last30d,
        SUM(CASE WHEN consent_at IS NOT NULL THEN 1 ELSE 0 END) AS consented
      FROM users`).get(day, d7, d30) as Row;

    const rev = db.prepare(`SELECT
        COALESCE(SUM(amount_try),0) AS total,
        COALESCE(SUM(CASE WHEN created_at>=? THEN amount_try ELSE 0 END),0) AS last7d,
        COALESCE(SUM(CASE WHEN created_at>=? THEN amount_try ELSE 0 END),0) AS last30d,
        COUNT(*) AS n
      FROM transactions WHERE type='purchase' AND status='paid'`).get(d7, d30) as Row;

    const cr = db.prepare(`SELECT
        COALESCE(SUM(CASE WHEN credits>0 THEN credits ELSE 0 END),0) AS granted,
        COALESCE(SUM(CASE WHEN credits<0 THEN -credits ELSE 0 END),0) AS spent
      FROM transactions`).get() as Row;

    const fTotal = db.prepare('SELECT COUNT(*) AS n FROM fortunes').get() as Row;
    const fByKind = db.prepare('SELECT kind, COUNT(*) AS count FROM fortunes GROUP BY kind ORDER BY count DESC').all() as Row[];

    return {
      users: {
        total: Number(u.total ?? 0), registered: Number(u.registered ?? 0), guest: Number(u.guest ?? 0),
        today: Number(u.today ?? 0), last7d: Number(u.last7d ?? 0), last30d: Number(u.last30d ?? 0), consented: Number(u.consented ?? 0),
      },
      revenue: { totalTry: Number(rev.total ?? 0), last7dTry: Number(rev.last7d ?? 0), last30dTry: Number(rev.last30d ?? 0), purchases: Number(rev.n ?? 0) },
      credits: { grantedTotal: Number(cr.granted ?? 0), spentTotal: Number(cr.spent ?? 0) },
      fortunes: { total: Number(fTotal.n ?? 0), byKind: fByKind.map((r) => ({ kind: String(r.kind), count: Number(r.count) })) },
      ai: { openai: false, gemini: false, elevenlabs: false, payments: 'mock' }, // app.ts gerçek değerlerle doldurur
    };
  }

  function listUsers(opts: { query?: string; page?: number; pageSize?: number } = {}): { rows: AdminUserRow[]; total: number } {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
    const q = (opts.query ?? '').trim();
    const where = q ? 'WHERE u.email LIKE ? OR u.name LIKE ?' : '';
    const args = q ? [`%${q}%`, `%${q}%`] : [];
    const total = Number((db.prepare(`SELECT COUNT(*) AS n FROM users u ${where}`).get(...args) as Row).n);
    const rows = db.prepare(`
      SELECT u.id, u.email, u.name, u.sign, u.is_guest, u.created_at, u.consent_at,
             COALESCE(c.credits,0) AS credits, COALESCE(c.questions,0) AS questions,
             (SELECT COUNT(*) FROM transactions t WHERE t.user_id=u.id AND t.type='purchase' AND t.status='paid') AS purchase_count,
             (SELECT COALESCE(SUM(t.amount_try),0) FROM transactions t WHERE t.user_id=u.id AND t.type='purchase' AND t.status='paid') AS total_spent
      FROM users u LEFT JOIN credits c ON c.user_id=u.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?`).all(...args, pageSize, (page - 1) * pageSize) as Row[];
    return {
      total,
      rows: rows.map((r) => ({
        id: r.id, email: r.email, name: r.name, sign: r.sign, isGuest: !!r.is_guest, createdAt: r.created_at,
        consented: !!r.consent_at, credits: Number(r.credits), questions: Number(r.questions),
        purchaseCount: Number(r.purchase_count), totalSpentTry: Number(r.total_spent),
      })),
    };
  }

  function userDetail(uid: string) {
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(uid) as Row | undefined;
    if (!u) return null;
    const wallet = db.prepare('SELECT credits, questions FROM credits WHERE user_id=?').get(uid) as Row | undefined;
    const txs = db.prepare('SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(uid) as Row[];
    const fortuneCount = db.prepare('SELECT kind, COUNT(*) AS n FROM fortunes WHERE user_id=? GROUP BY kind').all(uid) as Row[];
    return {
      id: u.id, email: u.email, name: u.name, birthDate: u.birth_date, birthTime: u.birth_time ?? undefined,
      birthPlace: u.birth_place ?? undefined, sign: u.sign, isGuest: !!u.is_guest, createdAt: u.created_at,
      consentAt: u.consent_at ?? undefined, referralCode: u.referral_code,
      wallet: { credits: Number(wallet?.credits ?? 0), questions: Number(wallet?.questions ?? 0) },
      transactions: txs.map((t) => ({
        id: t.id, type: t.type, title: t.title, credits: t.credits, questions: t.questions,
        amountTry: t.amount_try, status: t.status, provider: t.provider, createdAt: t.created_at,
      })),
      fortunesByKind: fortuneCount.map((r) => ({ kind: String(r.kind), count: Number(r.n) })),
    };
  }

  function listTransactions(opts: { page?: number; pageSize?: number; type?: string; status?: string } = {}): { rows: AdminTxRow[]; total: number } {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
    const clauses: string[] = [];
    const args: unknown[] = [];
    if (opts.type) { clauses.push('t.type=?'); args.push(opts.type); }
    if (opts.status) { clauses.push('t.status=?'); args.push(opts.status); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const total = Number((db.prepare(`SELECT COUNT(*) AS n FROM transactions t ${where}`).get(...args) as Row).n);
    const rows = db.prepare(`
      SELECT t.*, u.email AS user_email FROM transactions t JOIN users u ON u.id=t.user_id
      ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`).all(...args, pageSize, (page - 1) * pageSize) as Row[];
    return {
      total,
      rows: rows.map((r) => ({
        id: r.id, userId: r.user_id, userEmail: r.user_email, type: r.type, title: r.title, credits: r.credits,
        questions: r.questions, amountTry: r.amount_try, status: r.status, provider: r.provider, createdAt: r.created_at,
      })),
    };
  }

  return { stats, listUsers, userDetail, listTransactions };
}

export type AdminStore = ReturnType<typeof createAdminStore>;
