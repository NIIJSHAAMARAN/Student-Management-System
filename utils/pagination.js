const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Returns { page, limit, skip } or { error }
const parsePagination = (query) => {
  let page = 1;
  let limit = DEFAULT_LIMIT;

  if (query.page !== undefined) {
    if (!/^\d+$/.test(query.page) || Number(query.page) < 1) {
      return { error: "page must be a positive whole number" };
    }
    page = Number(query.page);
  }

  if (query.limit !== undefined) {
    if (!/^\d+$/.test(query.limit) || Number(query.limit) < 1 || Number(query.limit) > MAX_LIMIT) {
      return { error: `limit must be a whole number from 1 to ${MAX_LIMIT}` };
    }
    limit = Number(query.limit);
  }

  return { page, limit, skip: (page - 1) * limit };
};

const buildMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

module.exports = { parsePagination, buildMeta };