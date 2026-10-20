-- Tasting Atlas v1. Run in a fresh Supabase project. No service-role key required by app.
begin;
create extension if not exists pgcrypto;
create function public.valid_sensory(value jsonb) returns boolean language sql immutable as $$
 select jsonb_typeof(value)='object' and not exists(select 1 from jsonb_each(value) e where jsonb_typeof(e.value)<>'number' or e.value::text not in ('1','2','3','4','5'));
$$;
create table public.beverages (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(category in ('wine','tea','coffee','whisky','other')),
 name text not null check(length(trim(name))>0), producer text not null default '', subtype text not null default '',
 year integer check(year between 1 and 9999), metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,user_id)
);
create table public.origins (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 parent_id uuid, country text not null check(length(trim(country))>0),region text not null default '',subregion text not null default '',display_name text not null default '',
 latitude double precision check(latitude between -90 and 90),longitude double precision check(longitude between -180 and 180),
 precision text not null default 'unresolved' check(precision in ('country','region','subregion','exact','unresolved')),
 confirmed boolean not null default false,created_at timestamptz not null default now(),unique(id,user_id),
 foreign key(parent_id,user_id) references public.origins(id,user_id),
 check((latitude is null)=(longitude is null)),check(latitude is null or (confirmed and precision<>'unresolved'))
);
create table public.beverage_origins (
 beverage_id uuid not null,origin_id uuid not null,user_id uuid not null default auth.uid(),relationship_type text not null default 'production',
 primary key(beverage_id,origin_id),foreign key(beverage_id,user_id) references public.beverages(id,user_id) on delete cascade,
 foreign key(origin_id,user_id) references public.origins(id,user_id) on delete cascade
);
create table public.tastings (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,beverage_id uuid not null,
 tasted_on date,notes text not null default '',drinking_location text not null default '',
 sensory jsonb not null default '{}' check(public.valid_sensory(sensory)), observations jsonb not null default '{}' check(jsonb_typeof(observations)='object'),
 brewing jsonb not null default '{}' check(jsonb_typeof(brewing)='object'),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(beverage_id,user_id) references public.beverages(id,user_id) on delete cascade,unique(id,user_id)
);
create table public.tasting_infusions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),tasting_id uuid not null,
 infusion_number integer not null check(infusion_number>0),duration_seconds double precision check(duration_seconds>=0),temperature double precision check(temperature between 0 and 150),
 aroma text not null default '',taste text not null default '',notes text not null default '',
 foreign key(tasting_id,user_id) references public.tastings(id,user_id) on delete cascade,unique(tasting_id,infusion_number)
);
create table public.aroma_tags (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 canonical_name text not null,display_name text not null,aroma_family text not null default 'Other',unique(user_id,canonical_name),unique(id,user_id)
);
create table public.tasting_aroma_tags (
 tasting_id uuid not null,aroma_tag_id uuid not null,user_id uuid not null default auth.uid(),primary key(tasting_id,aroma_tag_id),
 foreign key(tasting_id,user_id) references public.tastings(id,user_id) on delete cascade,foreign key(aroma_tag_id,user_id) references public.aroma_tags(id,user_id) on delete cascade
);
create table public.photos (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 beverage_id uuid,tasting_id uuid,storage_path text not null,sort_order integer not null default 0,is_cover boolean not null default false,created_at timestamptz not null default now(),
 check((beverage_id is null)<>(tasting_id is null)),check(storage_path like user_id::text||'/%'),
 foreign key(beverage_id,user_id) references public.beverages(id,user_id) on delete cascade,foreign key(tasting_id,user_id) references public.tastings(id,user_id) on delete cascade
);
create index on public.beverages(user_id,category);
create index on public.tastings(user_id,beverage_id,tasted_on desc);
create index on public.origins(user_id);
create index on public.photos(user_id,tasting_id);
create index on public.beverage_origins(user_id);
create index on public.tasting_infusions(user_id,tasting_id);
create index on public.tasting_aroma_tags(user_id,tasting_id);
do $$ declare tab text;begin
 foreach tab in array array['beverages','origins','beverage_origins','tastings','tasting_infusions','aroma_tags','tasting_aroma_tags','photos'] loop
 execute format('alter table public.%I enable row level security',tab);
 execute format('create policy owner_only on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',tab);
 execute format('grant select,insert,update,delete on public.%I to authenticated',tab);
 execute format('revoke all on public.%I from anon',tab);
 end loop;
end $$;
create function public.save_beverage(payload jsonb) returns void language plpgsql security invoker set search_path=public as $$
declare b jsonb:=payload->'beverage';o jsonb;oid text;u uuid:=auth.uid();bid uuid:=(payload->'beverage'->>'id')::uuid;
begin
 if u is null then raise exception 'Authentication required';end if;
 insert into beverages(id,user_id,category,name,producer,subtype,year,metadata,created_at,updated_at)
 values(bid,u,b->>'category',trim(b->>'name'),coalesce(b->>'producer',''),coalesce(b->>'subtype',''),(b->>'year')::int,coalesce(b->'metadata','{}'),coalesce((b->>'created_at')::timestamptz,now()),now())
 on conflict(id) do update set category=excluded.category,name=excluded.name,producer=excluded.producer,subtype=excluded.subtype,year=excluded.year,metadata=excluded.metadata,updated_at=now();
 for o in select value from jsonb_array_elements(coalesce(payload->'origins','[]')) loop
 insert into origins(id,user_id,country,region,subregion,display_name,latitude,longitude,precision,confirmed,parent_id)
 values((o->>'id')::uuid,u,o->>'country',coalesce(o->>'region',''),coalesce(o->>'subregion',''),coalesce(o->>'display_name',''),(o->>'latitude')::double precision,(o->>'longitude')::double precision,coalesce(o->>'precision','unresolved'),coalesce((o->>'confirmed')::boolean,false),(o->>'parent_id')::uuid)
 on conflict(id) do update set country=excluded.country,region=excluded.region,subregion=excluded.subregion,display_name=excluded.display_name,latitude=excluded.latitude,longitude=excluded.longitude,precision=excluded.precision,confirmed=excluded.confirmed;
 end loop;
 delete from beverage_origins where beverage_id=bid;
 for oid in select jsonb_array_elements_text(coalesce(b->'origin_ids','[]')) loop
 insert into beverage_origins(beverage_id,origin_id,user_id) values(bid,oid::uuid,u);
 end loop;
end $$;
create function public.save_tasting(payload jsonb) returns void language plpgsql security invoker set search_path=public as $$
declare t jsonb:=payload->'tasting';i jsonb;p jsonb;tag text;tagid uuid;u uuid:=auth.uid();tid uuid:=(payload->'tasting'->>'id')::uuid;
begin
 if u is null then raise exception 'Authentication required';end if;
 perform public.save_beverage(payload);
 insert into tastings(id,user_id,beverage_id,tasted_on,notes,drinking_location,sensory,observations,brewing,created_at,updated_at)
 values(tid,u,(t->>'beverage_id')::uuid,(t->>'tasted_on')::date,coalesce(t->>'notes',''),coalesce(t->>'drinking_location',''),coalesce(t->'sensory','{}'),coalesce(t->'observations','{}'),coalesce(t->'brewing','{}'),coalesce((t->>'created_at')::timestamptz,now()),now())
 on conflict(id) do update set beverage_id=excluded.beverage_id,tasted_on=excluded.tasted_on,notes=excluded.notes,drinking_location=excluded.drinking_location,sensory=excluded.sensory,observations=excluded.observations,brewing=excluded.brewing,updated_at=now();
 delete from tasting_infusions where tasting_id=tid;
 for i in select value from jsonb_array_elements(coalesce(t->'infusions','[]')) loop
 insert into tasting_infusions(id,user_id,tasting_id,infusion_number,duration_seconds,temperature,aroma,taste,notes)
 values((i->>'id')::uuid,u,tid,(i->>'infusion_number')::int,(i->>'duration_seconds')::double precision,(i->>'temperature')::double precision,coalesce(i->>'aroma',''),coalesce(i->>'taste',''),coalesce(i->>'notes',''));
 end loop;
 delete from tasting_aroma_tags where tasting_id=tid;
 for tag in select distinct jsonb_array_elements_text(coalesce(t->'aromas','[]')) loop
 insert into aroma_tags(user_id,canonical_name,display_name,aroma_family) values(u,lower(trim(tag)),trim(tag),case
 when tag~*'(lemon|lime|fruit|apple|cherry|berry|plum|peach|citrus|melon|grape|apricot)' then 'Fruity'
 when tag~*'(flower|rose|violet|orchid|jasmine|floral|난향)' then 'Floral'
 when tag~*'(herb|grass|hay|풀)' then 'Herbal' when tag~*'(spic|pepper)' then 'Spicy'
 when tag~*'(wood|oak|cedar)' then 'Woody' when tag~*'(nut|chestnut|밤)' then 'Nutty'
 when tag~*'(roast|toast|coffee|chocol|caramel)' then 'Roasted' when tag~*'(earth|peat|흙)' then 'Earthy' else 'Other' end)
 on conflict(user_id,canonical_name) do update set display_name=excluded.display_name returning id into tagid;
 insert into tasting_aroma_tags(tasting_id,aroma_tag_id,user_id) values(tid,tagid,u) on conflict do nothing;
 end loop;
 delete from photos where tasting_id=tid;
 for p in select value from jsonb_array_elements(coalesce(payload->'photos','[]')) loop
 if (p->>'tasting_id')::uuid<>tid or p->>'beverage_id' is not null then raise exception 'Photo parent mismatch';end if;
 insert into photos(id,user_id,tasting_id,storage_path,sort_order,is_cover) values((p->>'id')::uuid,u,tid,p->>'storage_path',coalesce((p->>'sort_order')::int,0),coalesce((p->>'is_cover')::boolean,false));
 end loop;
end $$;
create function public.load_archive() returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
 'beverages',coalesce((select jsonb_agg(to_jsonb(b)-'user_id'||jsonb_build_object('origin_ids',coalesce((select jsonb_agg(bo.origin_id) from beverage_origins bo where bo.beverage_id=b.id),'[]'))) from beverages b),'[]'),
 'tastings',coalesce((select jsonb_agg(to_jsonb(t)-'user_id'||jsonb_build_object('aromas',coalesce((select jsonb_agg(a.display_name order by a.display_name) from tasting_aroma_tags ta join aroma_tags a on a.id=ta.aroma_tag_id where ta.tasting_id=t.id),'[]'),'infusions',coalesce((select jsonb_agg(to_jsonb(i)-'user_id'-'tasting_id' order by i.infusion_number) from tasting_infusions i where i.tasting_id=t.id),'[]'))) from tastings t),'[]'),
 'origins',coalesce((select jsonb_agg(to_jsonb(o)-'user_id') from origins o),'[]'),
 'photos',coalesce((select jsonb_agg(to_jsonb(p)-'user_id'||jsonb_build_object('url','')) from photos p),'[]')
 );
$$;
revoke all on function public.save_beverage(jsonb),public.save_tasting(jsonb),public.load_archive() from public,anon;
grant execute on function public.save_beverage(jsonb),public.save_tasting(jsonb),public.load_archive() to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('tasting-photos','tasting-photos',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy private_photos_select on storage.objects for select to authenticated using(bucket_id='tasting-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy private_photos_insert on storage.objects for insert to authenticated with check(bucket_id='tasting-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy private_photos_update on storage.objects for update to authenticated using(bucket_id='tasting-photos' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='tasting-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy private_photos_delete on storage.objects for delete to authenticated using(bucket_id='tasting-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
