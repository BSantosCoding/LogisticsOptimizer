-- Create Form Factors Table
create table if not exists form_factors (
  id text primary key,
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for form_factors
alter table form_factors enable row level security;

create policy "Users can view form_factors for their company"
  on form_factors for select
  using (company_id in (
    select company_id from profiles where id = auth.uid()
  ));

create policy "Users can insert form_factors for their company"
  on form_factors for insert
  with check (company_id in (
    select company_id from profiles where id = auth.uid()
  ));

create policy "Users can update form_factors for their company"
  on form_factors for update
  using (company_id in (
    select company_id from profiles where id = auth.uid()
  ));

create policy "Users can delete form_factors for their company"
  on form_factors for delete
  using (company_id in (
    select company_id from profiles where id = auth.uid()
  ));

-- Alter Products Table
alter table products 
  add column if not exists form_factor_id text references form_factors(id) on delete set null,
  add column if not exists quantity integer default 1;

-- Alter Deals (Containers) Table
alter table deals
  add column if not exists capacities jsonb default '{}'::jsonb;

-- Note: We are not dropping weight/volume columns immediately to avoid data loss during dev, 
-- but the app will stop using them.
