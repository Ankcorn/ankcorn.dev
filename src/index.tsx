import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import home from "./pages/home";
import about from "./pages/about";
import system from "./pages/system";
import blog from "./pages/blog";
import energy from "./pages/energy";

const app = new Hono();

app.use("/static/*", serveStatic({ root: "./" }));

app.route("/", home);
app.route("/about", about);
app.route("/system", system);
app.route("/blog", blog);
app.route("/energy", energy);

export default {
  port: 3000,
  fetch: app.fetch,
};
