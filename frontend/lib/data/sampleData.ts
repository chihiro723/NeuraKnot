/**
 * サンプルデータの生成
 */

import type { FriendData, ConversationData } from '@/lib/types'

/**
 * サンプルエージェントデータを生成
 */
export const generateSampleAIAgents = (): FriendData[] => [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    type: 'ai',
    name: 'サポートボット',
    avatar_url: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=150',
    status: 'online',
    personality_preset: 'support'
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    type: 'ai',
    name: 'フレンドちゃん',
    avatar_url: 'https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg?auto=compress&cs=tinysrgb&w=150',
    status: 'online',
    personality_preset: 'friendly'
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    type: 'ai',
    name: 'ビジネスアシスタント',
    avatar_url: 'https://images.pexels.com/photos/8386439/pexels-photo-8386439.jpeg?auto=compress&cs=tinysrgb&w=150',
    status: 'online',
    personality_preset: 'business'
  },
  {
    id: 'a4444444-4444-4444-4444-444444444444',
    type: 'ai',
    name: 'のんびりくん',
    avatar_url: 'https://images.pexels.com/photos/8386442/pexels-photo-8386442.jpeg?auto=compress&cs=tinysrgb&w=150',
    status: 'online',
    personality_preset: 'casual'
  },
  {
    id: 'a5555555-5555-5555-5555-555555555555',
    type: 'ai',
    name: 'コメディアン太郎',
    avatar_url: 'https://images.pexels.com/photos/8386445/pexels-photo-8386445.jpeg?auto=compress&cs=tinysrgb&w=150',
    status: 'online',
    personality_preset: 'humor'
  }
]

/**
 * サンプル人間ユーザーデータを生成
 */
export const generateSampleHumanUsers = (): FriendData[] => [
  {
    id: 'h1111111-1111-1111-1111-111111111111',
    type: 'human',
    name: '田中太郎',
    avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
    status: 'online'
  },
  {
    id: 'h2222222-2222-2222-2222-222222222222',
    type: 'human',
    name: '佐藤花子',
    avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
    status: 'offline'
  }
]

/**
 * サンプル会話データを生成
 */
export const generateSampleConversations = (): ConversationData[] => [
  {
    id: 'conv-1',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    otherParticipant: {
      name: 'サポートボット',
      avatar_url: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=150',
      type: 'ai',
      status: 'online',
      personality_preset: 'support'
    },
    lastMessage: {
      content: 'お困りのことがございましたら、いつでもお声かけください！',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      sender_type: 'ai'
    }
  },
  {
    id: 'conv-2',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    otherParticipant: {
      name: 'フレンドちゃん',
      avatar_url: 'https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg?auto=compress&cs=tinysrgb&w=150',
      type: 'ai',
      status: 'online',
      personality_preset: 'friendly'
    },
    lastMessage: {
      content: 'こんにちは！今日はどんなことをお話ししましょうか？😊',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      sender_type: 'ai'
    }
  },
  {
    id: 'conv-6',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    otherParticipant: {
      name: '田中太郎',
      avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
      type: 'human',
      status: 'online'
    },
    lastMessage: {
      content: 'お疲れ様です！今度お食事でもいかがですか？',
      created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
      sender_type: 'human'
    }
  }
]

/**
 * 全てのサンプル友だちデータを取得
 */
export const getAllSampleFriends = (): FriendData[] => [
  ...generateSampleAIAgents(),
  ...generateSampleHumanUsers()
]