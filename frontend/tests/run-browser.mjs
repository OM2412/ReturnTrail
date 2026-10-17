import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const frontend = path.resolve(import.meta.dirname, '..')
const host = '127.0.0.1'
const port = 5174

// Do not accidentally test an unrelated server already listening on this port.
await new Promise((resolve, reject) => {
  const probe = net.createServer()
  probe.once('error', reject)
  probe.listen(port, host, () => probe.close(resolve))
})

const server = spawn(process.execPath, [path.join(frontend, 'node_modules/vite/bin/vite.js'), '--host', host, '--port', String(port)], {
  cwd: frontend, stdio: ['ignore', 'inherit', 'inherit'],
})
let startupError = null
server.once('error', (error) => { startupError = error })
server.once('exit', (code, signal) => {
  startupError = new Error(`Vite exited before browser checks completed (${signal || code})`)
})

try {
  const deadline = Date.now() + 30000
  let ready = false
  while (Date.now() < deadline) {
    if (startupError) throw startupError
    try {
      const response = await fetch(`http://${host}:${port}/`, { signal: AbortSignal.timeout(1000) })
      const html = await response.text()
      if (response.ok && html.includes('id="root"')) { ready = true; break }
    } catch { /* The server may still be starting. */ }
    await delay(100)
  }
  if (!ready) throw new Error('Vite HTTP readiness timed out after 30 seconds')
  if (startupError) throw startupError
  const test = spawn(process.execPath, [path.join(import.meta.dirname, 'browser.mjs')], {
    cwd: frontend, stdio: 'inherit', env: process.env,
  })
  process.exitCode = await new Promise((resolve, reject) => {
    test.once('error', reject)
    test.once('exit', (code) => resolve(code ?? 1))
  })
  if (startupError) throw startupError
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    await new Promise((resolve) => {
      const timeout = setTimeout(() => server.kill('SIGKILL'), 3000)
      server.once('exit', () => { clearTimeout(timeout); resolve() })
      server.kill('SIGTERM')
    })
  }
}
