import { Hono } from "hono";
import { Layout } from "../layout";
import { getPostBySlug } from "../utils/blog";

const app = new Hono();

app.get("/:slug", (c) => {
  const slug = c.req.param("slug");
  const post = getPostBySlug(slug);

  if (!post) {
    return c.html(
      <Layout showFooter>
        <article class="prose dark:prose-invert max-w-none">
          <h1>Post not found</h1>
          <p>
            <a href="/">Go back home</a>
          </p>
        </article>
      </Layout>,
      404
    );
  }

  return c.html(
    <Layout showFooter>
      <article class="prose dark:prose-invert max-w-none">
        <time class="text-sm text-gray-500 dark:text-gray-400">
          {post.date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    </Layout>
  );
});

export default app;
