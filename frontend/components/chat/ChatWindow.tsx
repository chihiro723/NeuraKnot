import { useState, useRef, useEffect } from 'react'
import { Send, Smile, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Message {
  id: string
  content: string
  sender_type: 'human' | 'ai'
  sender_id: string
  created_at: string
}

interface SelectedChat {
  id: string
  name: string
  avatar_url?: string
  type: 'human' | 'ai'
  status: 'online' | 'offline'
  personality_preset?: string
}

interface ChatWindowProps {
  selectedChat: SelectedChat
}

/**
 * チャットウィンドウコンポーネント - 完璧に統一されたデザインシステム
 */
export function ChatWindow({ selectedChat }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // サンプルメッセージデータ
  useEffect(() => {
    const loadMessages = () => {
      const sampleMessages: Message[] = [
        {
          id: '1',
          content: 'こんにちは！お疲れ様です😊',
          sender_type: 'ai',
          sender_id: selectedChat.id,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          content: 'こんにちは！今日はどんなことをお話ししましょうか？',
          sender_type: 'human',
          sender_id: 'current-user',
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          content: selectedChat.type === 'ai' 
            ? 'たくさんお話しできて嬉しいです！何か質問があれば、お気軽にどうぞ🌟' 
            : '今日は新しいプロジェクトについて話し合いましょう！',
          sender_type: selectedChat.type,
          sender_id: selectedChat.id,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
      ]

      setMessages(sampleMessages)
    }

    loadMessages()
  }, [selectedChat])

  // メッセージ送信時に最下部にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleSendMessage = () => {
    if (!newMessage.trim() || isLoading) return

    // 人間のメッセージを追加
    const humanMessage: Message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      sender_type: 'human',
      sender_id: 'current-user',
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, humanMessage])
    setNewMessage('')

    // AIの場合のみ自動返信
    if (selectedChat.type === 'ai') {
      setIsLoading(true)
      
      timeoutRef.current = setTimeout(() => {
        const aiResponses = {
          friendly: [
            'そうですね！とても興味深いお話ですね😊',
            'わあ、それは素晴らしいアイデアだと思います！',
            'なるほど〜、とても勉強になります！'
          ],
          business: [
            '承知いたしました。詳細についてお教えください。',
            'その件についてさらに検討させていただきます。',
            'ご提案ありがとうございます。検討いたします。'
          ],
          casual: [
            'なるほど〜、そういうことなんですね！',
            'それは面白そうですね！',
            'のんびり話しましょう〜'
          ],
          humor: [
            'それは面白いですね！😂 私も笑ってしまいました！',
            'ユーモアのセンスが素晴らしいですね！',
            '今度はもっと面白い話を聞かせてください！'
          ]
        }

        const responses = aiResponses[selectedChat.personality_preset as keyof typeof aiResponses] || [
          'ありがとうございます。',
          'そうですね。',
          'なるほど。'
        ]

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: responses[Math.floor(Math.random() * responses.length)],
          sender_type: 'ai',
          sender_id: selectedChat.id,
          created_at: new Date().toISOString()
        }

        setMessages(prev => [...prev, aiMessage])
        setIsLoading(false)
        timeoutRef.current = null
      }, 1000 + Math.random() * 2000) // 1-3秒のランダムな遅延
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_type === 'human' ? 'justify-end' : 'justify-start'
              } px-2 animate-fadeIn mb-10`}
            >
              <div className={`flex items-end space-x-4 max-w-[75%] lg:max-w-[60%] ${
                message.sender_type === 'human' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                {message.sender_type === 'human' ? (
                  /* 自分のメッセージ（右側） */
                  <div className={cn(
                    "px-4 py-3 rounded-2xl shadow-sm rounded-br-sm",
                    "bg-green-500 text-white"
                  )}>
                    <p className="text-sm lg:text-base leading-relaxed break-words">{message.content}</p>
                    <p className="text-xs mt-1 text-green-100">
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                ) : (
                  /* 相手のメッセージ（左側） */
                  <div className="flex items-start space-x-3 max-w-full">
                    {/* アイコン */}
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedChat.avatar_url ? (
                        <img
                          src={selectedChat.avatar_url}
                          alt={selectedChat.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-medium text-sm">
                          {selectedChat.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    
                    {/* 右側のコンテンツ */}
                    <div className="flex flex-col space-y-1 flex-1 min-w-0">
                      {/* 名前 */}
                      <span className="text-sm font-medium text-gray-600">
                        {selectedChat.name}
                      </span>
                      
                      {/* メッセージバブル */}
                      <div className={cn(
                        "bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-tl-sm",
                        "px-4 py-3 shadow-sm max-w-xs"
                      )}>
                        <p className="text-sm lg:text-base leading-relaxed break-words">{message.content}</p>
                        <p className="text-xs mt-1 text-gray-500">
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 入力中インジケーター */}
          {isLoading && (
            <div className="flex justify-start px-2 animate-fadeIn">
              <div className="flex items-start space-x-3 max-w-[75%]">
                {/* アイコン */}
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  <span className="text-white font-medium text-sm">
                    {selectedChat.name.charAt(0)}
                  </span>
                </div>
                
                {/* 名前 */}
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-gray-600">
                    {selectedChat.name}
                  </span>
                  
                  {/* 入力中バブル */}
                  <div className="bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-xs">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 入力エリア */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="w-full">
          <div className="flex items-end space-x-2">
            <button className="p-2 text-gray-400 hover:text-green-500 rounded-lg hover:bg-gray-100 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="メッセージを入力..."
                className={cn(
                  "w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-2xl",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
                  "resize-none max-h-32 text-sm lg:text-base text-gray-900 placeholder-gray-500"
                )}
                rows={1}
                style={{ minHeight: '44px' }}
                disabled={isLoading}
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-green-500 rounded-lg hover:bg-gray-100 transition-colors">
                <Smile className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              className={cn(
                "p-3 rounded-full transition-colors disabled:cursor-not-allowed",
                "bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white"
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}