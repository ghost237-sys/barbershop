import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const CHECKIN_URL = import.meta.env.VITE_APP_URL || window.location.origin

export default function QRPage() {
  const handlePrint = () => window.print()

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-zinc-900 flex flex-col
                      items-center justify-center px-4 py-12">

        {/* QR Card */}
        <div className="print-card bg-white rounded-3xl p-10
                        flex flex-col items-center gap-6
                        shadow-2xl max-w-sm w-full">

          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
              <span className="text-xl opacity-50">🌸</span>
              <span className="text-4xl">💅</span>
              <span className="text-xl opacity-50">🌸</span>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Abaah Nail Parlour
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Beauty & Nail Care</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-px w-8 bg-pink-300" />
              <span className="text-pink-300 text-xs">✦</span>
              <div className="h-px w-8 bg-pink-300" />
            </div>
          </div>

          <div className="w-full h-px bg-zinc-100" />

          {/* QR Code */}
          <div className="p-4 bg-white rounded-2xl border-4 border-zinc-900">
            <QRCodeSVG
              value={CHECKIN_URL}
              size={220}
              bgColor="#ffffff"
              fgColor="#18181b"
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Instructions */}
          <div className="text-center">
            <p className="text-zinc-800 font-bold text-base">
              Scan to join our queue
            </p>
            <p className="text-zinc-400 text-xs mt-0.5">
              Scan ili kuingia foleni yetu
            </p>
          </div>

          <div className="w-full h-px bg-zinc-100" />

          <p className="text-zinc-400 text-xs text-center break-all">
            {CHECKIN_URL}
          </p>

          {/* Steps */}
          <div className="w-full flex flex-col gap-3">
            {[
              { step: '1', en: 'Scan the QR code', sw: 'Scan QR code' },
              { step: '2', en: 'Enter your name & number', sw: 'Weka jina na nambari' },
              { step: '3', en: "Relax — we'll notify you", sw: 'Pumzika, tutakujulisha' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-pink-500 text-white
                                flex items-center justify-center text-xs
                                font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="text-zinc-800 text-sm font-semibold">{item.en}</p>
                  <p className="text-zinc-400 text-xs">{item.sw}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Print button */}
        <button
          onClick={handlePrint}
          className="no-print mt-8 bg-pink-500 hover:bg-pink-400
                     active:scale-[0.98] text-white font-bold
                     px-8 py-4 rounded-2xl transition-all duration-200
                     shadow-lg shadow-pink-500/20 text-base"
        >
          🖨️ Print this QR Code
        </button>

        <a
          href="/"
          className="no-print mt-4 text-zinc-600 hover:text-zinc-400
                     text-sm transition-colors"
        >
          ← Back to check-in
        </a>

      </div>
    </>
  )
}