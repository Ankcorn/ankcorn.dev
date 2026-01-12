import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

export interface BlogPost {
  slug: string;
  title: string;
  date: Date;
  content: string;
}

const BLOGS_DIR = path.join(process.cwd(), "src/blogs");

export function getAllPosts(): BlogPost[] {
  const files = fs.readdirSync(BLOGS_DIR).filter((f) => f.endsWith(".md"));

  const posts = files.map((file) => {
    const filePath = path.join(BLOGS_DIR, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    return {
      slug: data.slug || file.replace(".md", ""),
      title: data.title || "Untitled",
      date: new Date(data.date),
      content: marked(content) as string,
    };
  });

  return posts.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const posts = getAllPosts();
  return posts.find((p) => p.slug === slug);
}
