function buildWindowStart(now, daysAgo) {
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

function summarizeRange(sales, from, to) {
  const salesMap = new Map();

  sales.forEach((sale) => {
    const saleDate = new Date(sale.date);
    if (saleDate < from || saleDate >= to) return;

    const current = salesMap.get(sale.item) || {
      item: sale.item,
      qty: 0,
      revenue: 0,
      snapPurchases: 0
    };

    current.qty += Number(sale.qty) || 0;
    current.revenue += (Number(sale.qty) || 0) * (Number(sale.price) || 0);
    if (sale.isSnap) current.snapPurchases += 1;

    salesMap.set(sale.item, current);
  });

  return [...salesMap.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
}

function summarizeSalesByPeriod(sales, now = new Date()) {
  const end = new Date(now);
  const currentStart = buildWindowStart(end, 7);
  const previousStart = buildWindowStart(end, 14);

  return {
    current: summarizeRange(sales, currentStart, end),
    previous: summarizeRange(sales, previousStart, currentStart)
  };
}

function buildTopSellersByPeriod(summary, limit = 5) {
  return {
    current: (summary.current || []).slice(0, limit),
    previous: (summary.previous || []).slice(0, limit)
  };
}

module.exports = {
  summarizeSalesByPeriod,
  buildTopSellersByPeriod
};
