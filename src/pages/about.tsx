import { Hono } from "hono";
import { Layout } from "../layout";

const app = new Hono();

app.get("/", (c) => {
  return c.html(
    <Layout>
      <article class="prose dark:prose-invert max-w-none">
        <img src="/static/me.jpg" alt="Thomas Ankcorn" class="float-right ml-4 mb-4 w-48 rounded-lg grayscale" />
        <p>
          I studied <a href="https://en.wikipedia.org/wiki/Control_engineering" target="_blank" rel="noopener noreferrer">Automatic Control and Systems Engineering</a> at the University
          of Sheffield where I drank too much Hobgoblin, danced to the Arctic
          Monkeys, met the love of my life, built anomaly detection using <a href="https://en.wikipedia.org/wiki/Robust_principal_component_analysis" target="_blank" rel="noopener noreferrer">Robust
          PCA</a>, learnt far too much about smart washing machines and <a href="https://en.wikipedia.org/wiki/Fuzzy_logic" target="_blank" rel="noopener noreferrer">fuzzy logic</a>,
          and occasionally picked up some programming.
        </p>
        <p>
          In 2017 I moved to London for BAE Systems, building software that, as a
          colleague liked to say, "stops bad people doing bad things". From there
          I joined <a href="https://near.st" target="_blank" rel="noopener noreferrer">NearSt</a>, a tiny startup where I discovered serverless and how it
          lets small teams punch above their weight. My boss Adam introduced me to
          Epsagon, and I was hooked on observability. We built systems processing
          hundreds of millions of stock updates daily.
        </p>
        <p>
          That obsession led me to <a href="https://baselime.io" target="_blank" rel="noopener noreferrer">Baselime</a>, where I spent a year with Boris Tane
          trying to build the perfect blend of Epsagon and Honeycomb. We sweated the
          details and built something pretty damn sweet.
        </p>
        <p>
          Then <a href="https://cloudflare.com" target="_blank" rel="noopener noreferrer">Cloudflare</a> invited us to their London office. Meeting Rita, Ben,
          Matt, Sid and others, it was clear there was a bigger mission here.
          Shipping at startup speed inside a company this size has been the
          hardest and most rewarding challenge yet.
        </p>
      </article>
    </Layout>
  );
});

export default app;
