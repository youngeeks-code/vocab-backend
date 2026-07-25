// Shared-secret gate, off by default. Leave APP_PASSWORD unset for local single-user
// use (current default — every request passes through). Set it once this stops being
// purely local, and every request must send it back via the X-App-Password header.
// Swap this out for real per-user auth later; every route already funnels through here.
module.exports = function auth(req, res, next) {
  const required = process.env.APP_PASSWORD;
  if (!required) return next();

  if (req.header('x-app-password') !== required) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};
