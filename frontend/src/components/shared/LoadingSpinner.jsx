export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="w-10 h-10 border-4 border-zinc-700 border-t-amber-400
                      rounded-full animate-spin" />
      <p className="text-zinc-400 text-sm">{message}</p>
    </div>
  )
}
