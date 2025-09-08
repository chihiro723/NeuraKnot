-- ============================================
-- BridgeSpeak Application - Clean Schema
-- Version: 2.0.0 (Trigger-free)
-- Created: 2025-01-10
-- Description: Complete database schema without application-logic triggers
-- All business logic is handled in application code for better maintainability
-- ============================================

-- ============================================
-- CLEANUP: Remove all application-logic triggers and functions
-- ============================================

-- Remove existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
DROP TRIGGER IF EXISTS add_group_creator_as_admin ON groups;

-- Remove application-logic functions (keep only database utilities)
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_conversation_updated_at();
DROP FUNCTION IF EXISTS add_creator_as_admin();
DROP FUNCTION IF EXISTS get_profile_by_email(text);

-- ============================================
-- ESSENTIAL EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES (unchanged structure)
-- ============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    display_name text NOT NULL,
    email text UNIQUE NOT NULL,
    avatar_url text,
    bio text,
    status text DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- AI Agents table
CREATE TABLE IF NOT EXISTS ai_agents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    personality text NOT NULL,
    avatar_url text,
    description text,
    created_at timestamptz DEFAULT now()
);

-- Friendships table
CREATE TABLE IF NOT EXISTS friendships (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- Conversations table (1-on-1 chats)
CREATE TABLE IF NOT EXISTS conversations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant1_id uuid NOT NULL,
    participant1_type text NOT NULL CHECK (participant1_type IN ('user', 'ai')),
    participant2_id uuid NOT NULL,
    participant2_type text NOT NULL CHECK (participant2_type IN ('user', 'ai')),
    last_message_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(participant1_id, participant2_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('user', 'ai')),
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Message reads table
CREATE TABLE IF NOT EXISTS message_reads (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at timestamptz DEFAULT now(),
    UNIQUE(message_id, user_id)
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    avatar_url text,
    created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at timestamptz DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- Group messages table
CREATE TABLE IF NOT EXISTS group_messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Group message reads table
CREATE TABLE IF NOT EXISTS group_message_reads (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id uuid NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at timestamptz DEFAULT now(),
    UNIQUE(message_id, user_id)
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Friendships indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Message reads indexes
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);

-- Groups indexes
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);

-- Group members indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

-- Group messages indexes
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);

-- Group message reads indexes
CREATE INDEX IF NOT EXISTS idx_group_message_reads_user_id ON group_message_reads(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - ESSENTIAL ONLY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start clean
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- AI Agents policies (public read)
CREATE POLICY "Everyone can view AI agents"
    ON ai_agents FOR SELECT
    TO authenticated
    USING (true);

-- Friendships policies
CREATE POLICY "Users can view their friendships"
    ON friendships FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create friendships"
    ON friendships FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their friendships"
    ON friendships FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Conversations policies
CREATE POLICY "Users can view their conversations"
    ON conversations FOR SELECT
    TO authenticated
    USING (
        (participant1_type = 'user' AND participant1_id = auth.uid()) OR
        (participant2_type = 'user' AND participant2_id = auth.uid())
    );

CREATE POLICY "Users can create conversations"
    ON conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        (participant1_type = 'user' AND participant1_id = auth.uid()) OR
        (participant2_type = 'user' AND participant2_id = auth.uid())
    );

CREATE POLICY "Users can update their conversations"
    ON conversations FOR UPDATE
    TO authenticated
    USING (
        (participant1_type = 'user' AND participant1_id = auth.uid()) OR
        (participant2_type = 'user' AND participant2_id = auth.uid())
    );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
    ON messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (
                (participant1_type = 'user' AND participant1_id = auth.uid()) OR
                (participant2_type = 'user' AND participant2_id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can send messages in their conversations"
    ON messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_type = 'user' AND sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (
                (participant1_type = 'user' AND participant1_id = auth.uid()) OR
                (participant2_type = 'user' AND participant2_id = auth.uid())
            )
        )
    );

-- Message reads policies
CREATE POLICY "Users can view their message reads"
    ON message_reads FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can mark messages as read"
    ON message_reads FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Groups policies
CREATE POLICY "Users can view groups they're members of"
    ON groups FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create groups"
    ON groups FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group admins can update groups"
    ON groups FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

-- Group members policies
CREATE POLICY "Users can view members of their groups"
    ON group_members FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join groups and admins can add members"
    ON group_members FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role = 'admin'
        )
    );

-- Group messages policies
CREATE POLICY "Users can view messages in their groups"
    ON group_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_messages.group_id
            AND group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to their groups"
    ON group_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_messages.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- Group message reads policies
CREATE POLICY "Users can view their group message reads"
    ON group_message_reads FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can mark group messages as read"
    ON group_message_reads FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- REALTIME FEATURES (ESSENTIAL FOR CHAT)
-- ============================================
-- Safely add tables to realtime publication (ignore if already exists)
DO $$ 
DECLARE
    table_name text;
    tables_to_add text[] := ARRAY['messages', 'conversations', 'friendships', 'profiles', 'groups', 'group_members', 'group_messages'];
BEGIN
    FOREACH table_name IN ARRAY tables_to_add LOOP
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || quote_ident(table_name);
            RAISE NOTICE 'Added table % to realtime publication', table_name;
        EXCEPTION 
            WHEN duplicate_object THEN
                RAISE NOTICE 'Table % already in realtime publication', table_name;
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not add table % to realtime: %', table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert AI agents
INSERT INTO ai_agents (id, name, personality, avatar_url, description) VALUES
    ('a0000000-0000-0000-0000-000000000001', '哲学者アリストテレス', 'philosophical', 'https://api.dicebear.com/7.x/avataaars/svg?seed=aristotle', '深い洞察と論理的思考で、人生の意味について語り合います。'),
    ('a0000000-0000-0000-0000-000000000002', '冒険家アメリア', 'adventurous', 'https://api.dicebear.com/7.x/avataaars/svg?seed=amelia', '世界中を旅した経験から、刺激的な冒険の話を共有します。'),
    ('a0000000-0000-0000-0000-000000000003', 'コメディアンのチャーリー', 'humorous', 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie', 'ユーモアと笑いで、どんな時も明るい雰囲気を作り出します。'),
    ('a0000000-0000-0000-0000-000000000004', '科学者のマリー', 'scientific', 'https://api.dicebear.com/7.x/avataaars/svg?seed=marie', '最新の科学的発見と技術について、分かりやすく説明します。'),
    ('a0000000-0000-0000-0000-000000000005', '詩人のルミ', 'poetic', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rumi', '美しい言葉と感動的な詩で、心に響くメッセージを届けます。')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICATION AND SUMMARY
-- ============================================

-- Verify cleanup
SELECT 
    'Remaining triggers:' as info,
    COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

SELECT 
    'Remaining custom functions:' as info,
    COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name NOT LIKE 'uuid_%';

-- Show RLS policies count
SELECT 
    'RLS policies created:' as info,
    COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public';

-- Show tables with realtime enabled
SELECT 
    'Realtime tables:' as info,
    COUNT(*) as count
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
AND t.table_name IN (
    'messages', 'conversations', 'friendships', 
    'profiles', 'groups', 'group_members', 'group_messages'
);