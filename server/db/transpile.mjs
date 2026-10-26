/**
 * Minimal MySQL -> PostgreSQL statement rewriter.
 *
 * The application was written against mysql2, so every query uses `?`
 * placeholders and a handful of MySQL-only functions. Keeping the rewrite in
 * one place means the route code stays untouched and readable.
 */

const STRING_LITERAL = "'";
const IDENTIFIER_QUOTE = '`';

/**
 * Replace `?` placeholders with `$1..$n` while ignoring quoted text.
 */
export const rewritePlaceholders = (sql) => {
  let out = '';
  let index = 0;
  let mode = null;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];

    if (mode === STRING_LITERAL) {
      out += ch;
      if (ch === STRING_LITERAL) {
        if (sql[i + 1] === STRING_LITERAL) {
          out += sql[i + 1];
          i += 1;
        } else {
          mode = null;
        }
      } else if (ch === '\\' && sql[i + 1] === STRING_LITERAL) {
        out += sql[i + 1];
        i += 1;
      }
      continue;
    }

    if (mode === IDENTIFIER_QUOTE) {
      out += ch === IDENTIFIER_QUOTE ? '"' : ch;
      if (ch === IDENTIFIER_QUOTE) mode = null;
      continue;
    }

    if (ch === STRING_LITERAL) {
      mode = STRING_LITERAL;
      out += ch;
      continue;
    }

    if (ch === IDENTIFIER_QUOTE) {
      mode = IDENTIFIER_QUOTE;
      out += '"';
      continue;
    }

    if (ch === '?') {
      index += 1;
      out += `$${index}`;
      continue;
    }

    out += ch;
  }

  return { sql: out, paramCount: index };
};

const convertIntervalDays = (sql) =>
  sql
    // DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    .replace(
      /\bDATE_SUB\(\s*(?:CURDATE\(\)|CURRENT_DATE)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
      '(CURRENT_DATE - $1)'
    )
    // CURDATE() - INTERVAL 7 DAY
    .replace(
      /(?:CURDATE\(\)|CURRENT_DATE)\s*-\s*INTERVAL\s+(\d+)\s+DAY/gi,
      '(CURRENT_DATE - $1)'
    );

const convertDateFormat = (sql) =>
  sql.replace(
    /\bDATE_FORMAT\(\s*([^,()]+(?:\([^()]*\))?[^,()]*)\s*,\s*'%Y-%m-%d'\s*\)/gi,
    (_match, expr) => `to_char(${expr.trim()}, 'YYYY-MM-DD')`
  );

/**
 * PostgreSQL folds unquoted identifiers to lowercase, which would break camel
 * case aliases the API returns to the frontend (e.g. quotaLimit).
 */
const quoteCamelCaseAliases = (sql) =>
  sql.replace(
    /\bAS\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    (match, alias) => (/[A-Z]/.test(alias) ? `AS "${alias}"` : match)
  );

/**
 * @param {string} rawSql
 * @param {{returning?: boolean}} options
 */
export const toPostgres = (rawSql, options = {}) => {
  let sql = String(rawSql).replace(/;\s*$/, '');

  sql = convertIntervalDays(sql);
  sql = convertDateFormat(sql);
  sql = quoteCamelCaseAliases(sql);
  sql = sql.replace(/\bNOW\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');
  sql = sql.replace(/\bCURDATE\s*\(\s*\)/gi, 'CURRENT_DATE');
  sql = sql.replace(/\bANY_VALUE\s*\(/gi, '(');
  sql = sql.replace(/\bIFNULL\s*\(/gi, 'COALESCE(');
  // MySQL: IF(condition, a, b) -> PostgreSQL: CASE WHEN condition THEN a ELSE b END
  let previous;
  do {
    previous = sql;
    sql = sql.replace(
      /\bIF\s*\(\s*([^,()]+?)\s*,\s*([^,()]+?)\s*,\s*([^,()]+?)\s*\)/gi,
      'CASE WHEN $1 THEN $2 ELSE $3 END'
    );
  } while (sql !== previous);

  // MySQL "LIMIT offset, count" -> "LIMIT count OFFSET offset"
  sql = sql.replace(/\bLIMIT\s+(\d+)\s*,\s*(\d+)/gi, 'LIMIT $2 OFFSET $1');

  const isInsertIgnore = /\bINSERT\s+IGNORE\s+INTO\b/i.test(sql);
  sql = sql.replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, 'INSERT INTO');

  const isInsert = /^\s*INSERT\s+INTO\b/i.test(sql);

  const { sql: withParams } = rewritePlaceholders(sql);
  sql = withParams;

  if (isInsertIgnore) {
    sql = `${sql} ON CONFLICT DO NOTHING`;
  }

  if (isInsert && options.returning && !/\bRETURNING\b/i.test(sql)) {
    sql = `${sql} RETURNING id`;
  }

  return sql;
};
