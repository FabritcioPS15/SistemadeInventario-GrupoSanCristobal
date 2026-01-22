-- Create tickets table
create table public.tickets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  priority text check (priority in ('low', 'medium', 'high', 'critical')) default 'medium',
  status text check (status in ('open', 'in_progress', 'resolved', 'closed')) default 'open',
  category text check (category in ('hardware', 'software', 'network', 'access', 'other')) default 'other',
  requester_id uuid references auth.users(id),
  assigned_to uuid references auth.users(id),
  location_id uuid
);

-- Create ticket_comments table
create table public.ticket_comments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  content text not null
);

-- Add RLS policies (Basic)
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;

create policy "Users can view all tickets" on public.tickets for select using (true);
create policy "Users can insert tickets" on public.tickets for insert with check (auth.uid() = requester_id);
create policy "Users can update their own tickets" on public.tickets for update using (auth.uid() = requester_id);

create policy "Users can view all comments" on public.ticket_comments for select using (true);
create policy "Users can insert comments" on public.ticket_comments for insert with check (auth.uid() = user_id);
