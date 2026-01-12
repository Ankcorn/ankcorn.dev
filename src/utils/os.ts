import os from "node:os";

export function getSystemInfo() {
    return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMem: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + " GB",
        freeMem: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + " GB",
        uptime: (os.uptime() / 3600).toFixed(2) + " hours",
      };
}