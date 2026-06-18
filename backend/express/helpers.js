const os = require("os");

function getIdParam(req) {
  const id = req.params.id;

  if (/^\d+$/.test(id)) {
    return Number.parseInt(id, 10);
  }

  throw new TypeError(`Invalid ':id' param: "${id}"`);
}

function pickHostIp() {
  if (process.env.HOST_IP) {
    return process.env.HOST_IP.trim();
  }

  const interfaces = os.networkInterfaces();
  const candidates = [];

  Object.entries(interfaces).forEach(([name, addrs]) => {
    (addrs || []).forEach((addr) => {
      if (addr.family !== "IPv4" || addr.internal) {
        return;
      }

      const ip = addr.address || "";
      const privateRange = /^10\./.test(ip)
        || /^192\.168\./.test(ip)
        || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
      const wifiLike = /(wi-?fi|wlan)/i.test(name);
      const virtualLike = /(virtual|vmware|vbox|loopback|hyper-v|tailscale|docker)/i.test(name);

      candidates.push({
        ip,
        score: (privateRange ? 10 : 0) + (wifiLike ? 5 : 0) - (virtualLike ? 8 : 0),
      });
    });
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.ip || "127.0.0.1";
}

module.exports = {
  getIdParam,
  pickHostIp,
};
