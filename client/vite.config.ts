import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

let prefix = ''
try {
  const cfgPath = resolve(__dirname, '..', 'data', 'config.json')
  if (existsSync(cfgPath)) {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'))
    prefix = cfg.urlPrefix || ''
  }
} catch { /* intentionally empty, defaults to prefix '' */ }

const BASE = process.env.VITE_BASE || (prefix ? `/${prefix}/` : '/')

// Vite's baseMiddleware leaks the secret URL prefix via its 404 hint message.
// We patch the compiled Vite chunk to replace both the hint and the root redirect
// with a plain "Not Found" response.
function suppressBaseHintPlugin() {
  const chunk = resolve(__dirname, 'node_modules', 'vite', 'dist', 'node', 'chunks', 'node.js')
  if (!existsSync(chunk)) return { name: 'suppress-base-hint' }

  let src = readFileSync(chunk, 'utf-8')

  // 1. Replace the HTML hint
  const oldHtml = 'The server is configured with a public base URL of ${base} - did you mean to visit <a href="${redirectPath}">${redirectPath}</a> instead?'
  src = src.replaceAll(oldHtml, 'Not Found')

  // 2. Replace the text hint
  const oldText = 'The server is configured with a public base URL of ${base} - did you mean to visit ${redirectPath} instead?'
  src = src.replaceAll(oldText, 'Not Found')

  // 3. Replace the root 302 redirect with a 404 (don't redirect / to the secret prefix)
  // The block is in the same baseMiddleware function. We replace the 302 line.
  const oldRedirect = 'res.writeHead(302, { Location: base + url.slice(pathname.length) });'
  if (src.includes(oldRedirect)) {
    src = src.replaceAll(oldRedirect, 'res.writeHead(404, { "Content-Type": "text/plain" });\n\t\t\tres.end("");\n\t\t\treturn;')
    // Remove the original res.end() and return that follow the 302
    src = src.replaceAll('\t\t\t\tres.end();\n\t\t\t\treturn;', '')
  }

  writeFileSync(chunk, src)
  return { name: 'suppress-base-hint' }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), suppressBaseHintPlugin()],
  base: BASE,
  server: {
    proxy: {
      [`/${prefix}/api`]: {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
