'use client'

import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const message = searchParams.get('message')

  const handleSignOut = () => {
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">エラーが発生しました</h2>
        <p className="text-gray-600 mb-6">
          {message || error?.message || '申し訳ございませんが、予期しないエラーが発生しました。'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
          >
            ログインページへ
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  )
}