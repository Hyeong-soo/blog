-- Create conversations table
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  created_at timestamptz default now()
);

-- Create messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conv_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text,
  type text default 'text' check (type in ('text', 'image')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Policies for conversations
create policy "Users can view their own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- Policies for messages
create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where id = public.messages.conv_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert messages in their conversations"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations
      where id = public.messages.conv_id
      and user_id = auth.uid()
    )
  );

-- Function to handle new messages from API (Service Role will bypass RLS, but for client usage we need policies)

-- Storage bucket for images (if not exists)
-- Note: You usually create buckets via the Supabase Dashboard.
-- Ensure a bucket named 'images' exists and is Public.
