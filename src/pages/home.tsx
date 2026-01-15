import { Hono } from "hono";
import { Layout } from "../layout";
import { getAllPosts } from "../utils/blog";

const app = new Hono();

app.get("/", (c) => {
  const posts = getAllPosts();

  return c.html(
    <Layout>
      <article class="prose prose-lg sm:prose-base dark:prose-invert max-w-none">
        <p>
          I'm an Engineer on the Workers Observability Team at{" "}
          <a href="https://x.com/CloudflareDev" target="_blank" rel="noopener noreferrer">Cloudflare</a>.
        </p>
      </article>

      <section class="mt-12">
        <h2 class="text-lg font-bold mb-4">Writing</h2>
        <ul class="space-y-3">
          {posts.map((post) => (
            <li class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <time class="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                {post.date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
              <a
                href={`/blog/${post.slug}`}
                class="hover:underline underline-offset-4"
              >
                {post.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
});

export default app;
