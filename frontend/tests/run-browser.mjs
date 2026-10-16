import { spawn } from 'node:child_process'
import path from 'node:path'

const frontend = path.resolve(import.meta.dirname, '..')
const server = spawn(process.execPath, [path.join(frontend, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5174'], { cwd: frontend, stdio: ['ignore', 'pipe', 'pipe'] })
let started = false
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Vite startup timed out')), 30000)
    server.stdout.on('data', (chunk) => { if (!started && chunk.toString().includes('Local:')) { started = true; clearTimeout(timeout); resolve() } })
    server.stderr.on('data', (chunk) => process.stderr.write(chunk))
    server.on('error', reject)
    server.on('exit', (code) => { if (!started) { clearTimeout(timeout); reject(new Error(`Vite exited ${code}`)) } })
  })
  const test = spawn(process.execPath, [path.join(import.meta.dirname, 'browser.mjs')], { cwd: path.resolve(import.meta.dirname, '..'), stdio: 'inherit', env: process.env })
  process.exitCode = await new Promise((resolve) => test.on('exit', (code) => resolve(code ?? 1)))
} finally { server.kill('SIGTERM') }
