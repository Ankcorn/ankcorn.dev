import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { Logger } from "hatchlet";
import home from "./pages/home";
import about from "./pages/about";
import system from "./pages/system";

const log = new Logger({
  dev: true,
});

const app = new Hono();

app.use("/static/*", serveStatic({ root: "./" }));

app.route("/", home);
app.route("/about", about);
app.route("/system", system);

serve(app, (l) => {
  log.info`Listening on http://localhost:${l.port}`;
});
