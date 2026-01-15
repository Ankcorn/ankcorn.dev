import { Hono } from "hono";
import { Layout } from "../layout";
import { getSystemInfo } from "../utils/os";

const app = new Hono();

app.get("/", (c) => {
  const sysInfo = getSystemInfo();
  return c.html(
    <Layout showFooter>
      <article class="prose prose-lg sm:prose-base dark:prose-invert max-w-none">
        <h1>System</h1>
        <ul>
          <li>Hostname: {sysInfo.hostname}</li>
          <li>Platform: {sysInfo.platform}</li>
          <li>Arch: {sysInfo.arch}</li>
          <li>CPUs: {sysInfo.cpus}</li>
          <li>Total Memory: {sysInfo.totalMem}</li>
          <li>Free Memory: {sysInfo.freeMem}</li>
          <li>Uptime: {sysInfo.uptime}</li>
        </ul>
      </article>
    </Layout>
  );
});

export default app;
