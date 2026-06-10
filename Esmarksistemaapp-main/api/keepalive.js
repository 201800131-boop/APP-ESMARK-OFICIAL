const { runKeepAlive } = require('../keepAlive');

module.exports = async (req, res) => {
  const result = await runKeepAlive();

  if (!result.ok) {
    return res.status(500).json({ ok: false, error: result.error });
  }

  return res.status(200).json({ ok: true, rows: result.rows });
};
