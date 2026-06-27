import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

// The URL customers will land on after scanning
const CHECKIN_URL = import.meta.env.VITE_APP_URL || window.location.origin

export default function QRPage() {
  const printRef = useRef(null)

  const handlePrint = () => window.print()

  return (
  <>
      {/*
        Print styles — when the page is printed:
        - Hide everything except the QR card
        - Remove backgrounds and shadows
      */}
      <style>{`
      @media print {
      body { background: white !important; }
      .no-print { display: none !important; }
      .print-card {
      box-shadow: none !important;
      border: none !important;
      }
      @page {
      margin: 0;
      size: A4;
    }
    body::before, body::after { display: none !important; }
    }
`   }
    </style>

      <div className="min-h-screen bg-rose-950 flex flex-col
                      items-center justify-center px-4 py-12">

        {/* QR Card */}
        <div
          ref={printRef}
          className="print-card bg-white rounded-3xl p-10
                     flex flex-col items-center gap-6
                     shadow-2xl max-w-sm w-full"
        >
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center items-center gap-1 mb-2">
              <span className="text-xl">🌸</span>
              <span className="text-4xl">💅</span>
              <span className="text-xl">🌸</span>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Abaah Nail Parlour
            </h1>
            <p className="text-zinc-500 text-sm mt-1 font-medium">
              Beauty & Nail Care — Skip the Wait
            </p>
          </div>

          {/* Instructions */}
          <div className="text-center">
            <p className="text-zinc-800 font-bold text-base">
                Scan to join our queue
            </p>
            <p className="text-zinc-500 text-sm mt-0.5">
                Scan ili kuingia foleni yetu
            </p>
          </div>

          {/* Steps */}
          {[
            { step: '1', en: 'Scan the QR code', sw: 'Scan QR code' },
            { step: '2', en: 'Enter your name & number', sw: 'Weka jina na nambari' },
            { step: '3', en: "Relax — we'll notify you 💅", sw: 'Pumzika, tutakujulisha' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-rose-950 text-white
                                flex items-center justify-center text-xs
                                font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="text-zinc-800 text-sm font-medium">{item.en}</p>
                  <p className="text-zinc-400 text-xs">{item.sw}</p>
                </div>
              </div>
            ))}
          </div>

        {/* Print button — hidden when printing */}
        <button
          onClick={handlePrint}
          className="no-print mt-8 bg-pink-400 hover:bg-pink-300
                     active:scale-[0.98] text-zinc-900 font-bold
                     px-8 py-4 rounded-2xl transition-all duration-200
                     shadow-lg shadow-pink-400/20 text-base"
        >
          🖨️ Print this QR Code
        </button>
       {/* Back link */}
        <a href="/" className="no-print mt-4 text-zinc-600 hover:text-zinc-400 text-sm transition-colors">
          ← Back to check-in
        </a>

      </div>
    </>
)
} 