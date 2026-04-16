/**
 * Generate PWA icons using Canvas API (Node 18+)
 * Run: node scripts/gen-icons.mjs
 */
import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

function drawIcon(size, maskable = false) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const pad = maskable ? size * 0.15 : size * 0.08

  // Background
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, size, size)

  // Rounded rect clip for maskable
  if (maskable) {
    ctx.fillStyle = '#18181b'
    const r = size * 0.22
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.lineTo(size - r, 0)
    ctx.quadraticCurveTo(size, 0, size, r)
    ctx.lineTo(size, size - r)
    ctx.quadraticCurveTo(size, size, size - r, size)
    ctx.lineTo(r, size)
    ctx.quadraticCurveTo(0, size, 0, size - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    ctx.fill()
  }

  // Draw "ABP" monogram
  const cx = size / 2
  const cy = size / 2
  const innerSize = size - pad * 2

  // Circle bg
  ctx.beginPath()
  ctx.arc(cx, cy, innerSize * 0.45, 0, Math.PI * 2)
  ctx.fillStyle = '#27272a'
  ctx.fill()

  // Letter
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${innerSize * 0.32}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ABP', cx, cy)

  // Accent dot
  ctx.beginPath()
  ctx.arc(cx + innerSize * 0.25, cy + innerSize * 0.22, innerSize * 0.06, 0, Math.PI * 2)
  ctx.fillStyle = '#22c55e'
  ctx.fill()

  return canvas.toBuffer('image/png')
}

try {
  const { createCanvas: cc } = await import('canvas')
  writeFileSync(join(outDir, 'icon-192.png'), drawIcon(192))
  writeFileSync(join(outDir, 'icon-512.png'), drawIcon(512))
  writeFileSync(join(outDir, 'icon-maskable.png'), drawIcon(512, true))
  console.log('Icons generated in public/icons/')
} catch {
  console.log('canvas package not available — creating placeholder SVG icons')
  // Create SVG-based placeholder
  const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0f"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.4}" fill="#27272a"/>
  <text x="${size/2}" y="${size/2}" font-family="Arial" font-weight="bold" font-size="${size*0.3}" fill="white" text-anchor="middle" dominant-baseline="central">ABP</text>
  <circle cx="${size*0.7}" cy="${size*0.7}" r="${size*0.06}" fill="#22c55e"/>
</svg>`
  writeFileSync(join(outDir, 'icon.svg'), svg(512))
  console.log('SVG icon placeholder created. For production, replace with real PNGs.')
}
