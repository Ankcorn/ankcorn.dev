import type { FC } from 'hono/jsx'

export const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body class="font-mono dark:text-gray-100 dark:bg-neutral-900 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 min-h-screen">
        <div class="mx-auto max-w-3xl mt-8">
          <header class="mb-8">
            <nav class="flex items-center justify-between">
              <a href="/" class="text-xl font-bold">Thomas Ankcorn</a>
              <div class="flex gap-4">
                <a href="/about" class="hover:underline underline-offset-4">About</a>
                <a href="/system" class="hover:underline underline-offset-4">System</a>
                <a href="https://x.com/thomas_ankcorn" target="_blank" rel="noopener noreferrer" class="hover:underline underline-offset-4">X</a>
              </div>
            </nav>
          </header>
          {props.children}
        </div>
      </body>
    </html>
  )
}