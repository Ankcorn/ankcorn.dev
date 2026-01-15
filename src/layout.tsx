import type { Child, FC } from 'hono/jsx'

export const Layout: FC<{ showFooter?: boolean; children: Child }> = (props) => {
  return (
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body class="font-mono text-base dark:text-gray-100 dark:bg-neutral-900 min-h-screen flex flex-col">
        <div class="mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-8 mt-8 flex-1">
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
        {props.showFooter && (
          <footer class="mt-16 py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <p>&copy; {new Date().getFullYear()} Thomas Ankcorn</p>
            <div class="flex gap-4">
              <a href="https://x.com/thomas_ankcorn" target="_blank" rel="noopener noreferrer" class="hover:text-gray-700 dark:hover:text-gray-200">
                X
              </a>
              <a href="https://www.linkedin.com/in/thomas-ankcorn-370889151/" target="_blank" rel="noopener noreferrer" class="hover:text-gray-700 dark:hover:text-gray-200">
                LinkedIn
              </a>
            </div>
          </footer>
        )}
      </body>
    </html>
  )
}