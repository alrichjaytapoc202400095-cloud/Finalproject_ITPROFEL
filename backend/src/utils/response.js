// One response envelope everywhere (T-04):
// success -> { success: true, data, meta }
// error   -> { success: false, error: { code, message, details }, requestId }
function ok(res, data, meta, status = 200) {
  return res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

function created(res, data) {
  return ok(res, data, null, 201);
}

function noContent(res) {
  return res.status(204).end();
}

module.exports = { ok, created, noContent };
