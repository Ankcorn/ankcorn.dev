import { Hono } from "hono";
import { Layout } from "../layout";

const app = new Hono();

app.get("/", (c) => {
  return c.html(
    <Layout>
      <article class="prose dark:prose-invert max-w-none">
        <p>
          I'm an engineer at{" "}
          <a href="https://cloudflare.com" target="_blank" rel="noopener noreferrer">Cloudflare</a>{" "}
          on the Workers Observability Team.
        </p>
      </article>
    </Layout>
  );
});

export default app;
