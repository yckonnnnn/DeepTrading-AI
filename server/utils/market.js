const inferMarketFromSymbol = (symbol) => {
  if (!symbol || typeof symbol !== 'string') return null;
  const clean = symbol.replace(/[^0-9]/g, '').trim();
  if (clean.length !== 6) return null;
  if (/^(60|68)\d{4}$/.test(clean)) return 'SH';
  if (/^(00|30)\d{4}$/.test(clean)) return 'SZ';
  if (/^(83|87|88|43|47)\d{4}$/.test(clean)) return 'BJ';
  return 'CN';
};

export { inferMarketFromSymbol };
