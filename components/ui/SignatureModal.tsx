'use client'
import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'

type SigMode = 'type' | 'draw' | 'upload'

const TYPED_STYLES = [
  { label: 'Signature 1', font: 'Georgia, serif',           style: 'italic' },
  { label: 'Signature 2', font: '"Palatino Linotype", serif', style: 'italic' },
  { label: 'Signature 3', font: 'Arial, sans-serif',         style: 'normal' },
  { label: 'Signature 4', font: '"Times New Roman", serif',  style: 'italic' },
]

interface Props {
  name: string
  onConfirm: (dataUrl: string) => void
  onCancel: () => void
}

export default function SignatureModal({ name, onConfirm, onCancel }: Props) {
  const [mode,        setMode]        = useState<SigMode>('type')
  const [typedStyle,  setTypedStyle]  = useState(0)
  const [isDrawing,   setIsDrawing]   = useState(false)
  const [hasDrawn,    setHasDrawn]    = useState(false)
  const [uploadedSrc, setUploadedSrc] = useState<string | null>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const lastPos    = useRef<{ x: number; y: number } | null>(null)

  // Draw mode helpers
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return
    setIsDrawing(true)
    lastPos.current = getPos(e, canvas)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#0D1F14'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    lastPos.current = pos
    setHasDrawn(true)
  }

  function stopDraw() { setIsDrawing(false); lastPos.current = null }

  function clearCanvas() {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  // Generate typed signature as data URL
  function getTypedDataUrl(): string {
    const canvas = document.createElement('canvas')
    canvas.width = 400; canvas.height = 80
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const style = TYPED_STYLES[typedStyle]
    ctx.font = `${style.style === 'italic' ? 'italic ' : ''}32px ${style.font}`
    ctx.fillStyle = '#0D1F14'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, 16, 44)
    return canvas.toDataURL()
  }

  function handleConfirm() {
    if (mode === 'type') {
      onConfirm(getTypedDataUrl())
    } else if (mode === 'draw') {
      if (!hasDrawn) return
      onConfirm(canvasRef.current!.toDataURL())
    } else if (mode === 'upload') {
      if (!uploadedSrc) return
      onConfirm(uploadedSrc)
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setUploadedSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const canConfirm = mode === 'type'
    ? name.trim().length > 0
    : mode === 'draw' ? hasDrawn : !!uploadedSrc

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-brand-900">Add your signature</h2>
          <p className="text-xs text-gray-400 mt-1">Choose how you'd like to sign</p>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-100">
          {(['type','draw','upload'] as SigMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={clsx(
                'flex-1 py-3 text-sm font-medium transition-colors',
                mode === m ? 'text-brand-900 border-b-2 border-brand-900' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {m === 'type' ? 'Type Name' : m === 'draw' ? 'Draw' : 'Upload Signature'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Type mode */}
          {mode === 'type' && (
            <div>
              <p className="text-xs text-gray-400 mb-3">Select a style for your name</p>
              <div className="space-y-2">
                {TYPED_STYLES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setTypedStyle(i)}
                    className={clsx(
                      'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                      typedStyle === i ? 'border-brand-700 bg-brand-50' : 'border-gray-100 hover:border-gray-200'
                    )}
                  >
                    <span style={{
                      fontFamily: s.font,
                      fontStyle: s.style,
                      fontSize: '22px',
                      color: '#0D1F14',
                    }}>
                      {name || 'Your Name'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Draw mode */}
          {mode === 'draw' && (
            <div>
              <p className="text-xs text-gray-400 mb-3">Draw your signature in the box below</p>
              <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={120}
                  className="w-full block cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-300 text-sm">Sign here</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">Sign with your mouse or finger</p>
                <button onClick={clearCanvas} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
              </div>
            </div>
          )}

          {/* Upload mode */}
          {mode === 'upload' && (
            <div>
              <p className="text-xs text-gray-400 mb-3">Upload a PNG or JPG of your signature</p>
              {uploadedSrc ? (
                <div className="border-2 border-brand-100 rounded-xl p-4 text-center">
                  <img src={uploadedSrc} alt="uploaded signature" className="max-h-20 max-w-full mx-auto" />
                  <button onClick={() => setUploadedSrc(null)} className="text-xs text-gray-400 hover:text-gray-600 underline mt-3 block mx-auto">
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-200 transition-colors"
                >
                  <p className="text-sm text-gray-400 mb-1">Click to upload</p>
                  <p className="text-xs text-gray-300">PNG, JPG or SVG</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 py-2.5 text-sm font-bold bg-brand-900 text-white rounded-xl hover:bg-brand-800 disabled:opacity-40"
          >
            Confirm signature
          </button>
        </div>
      </div>
    </div>
  )
}
