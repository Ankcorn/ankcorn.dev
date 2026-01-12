import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import home from "./pages/home";
import about from "./pages/about";
import system from "./pages/system";
import blog from "./pages/blog";

const app = new Hono();

app.use("/static/*", serveStatic({ root: "./" }));

app.route("/", home);
app.route("/about", about);
app.route("/system", system);
app.route("/blog", blog);

export default {
  port: 3000,
  fetch: app.fetch,
};
