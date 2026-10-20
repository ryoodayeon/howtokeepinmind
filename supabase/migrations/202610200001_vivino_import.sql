-- Apply after the initial migration. Extends private records for portable Vivino imports.
begin;
alter table public.tastings add column source jsonb;
alter table public.tastings add constraint tasting_source_shape check(source is null or jsonb_typeof(source)='object');
alter table public.photos alter column storage_path drop not null;
alter table public.photos add column external_url text;
alter table public.photos add constraint photo_source_kind check((storage_path is null)<>(external_url is null));
alter table public.photos add constraint photo_external_vivino check(external_url is null or external_url ~ '^https://images[.]vivino[.]com/labels/[A-Za-z0-9_-]+[.](jpg|jpeg|png|webp)$');
create or replace function public.save_tasting(payload jsonb) returns void language plpgsql security invoker set search_path=public as $$
declare t jsonb:=payload->'tasting';i jsonb;p jsonb;tag text;tagid uuid;u uuid:=auth.uid();tid uuid:=(payload->'tasting'->>'id')::uuid;
begin
 if u is null then raise exception 'Authentication required';end if;
 perform public.save_beverage(payload);
 insert into tastings(id,user_id,beverage_id,tasted_on,notes,drinking_location,sensory,observations,brewing,source,created_at,updated_at)
 values(tid,u,(t->>'beverage_id')::uuid,(t->>'tasted_on')::date,coalesce(t->>'notes',''),coalesce(t->>'drinking_location',''),coalesce(t->'sensory','{}'),coalesce(t->'observations','{}'),coalesce(t->'brewing','{}'),t->'source',coalesce((t->>'created_at')::timestamptz,now()),now())
 on conflict(id) do update set beverage_id=excluded.beverage_id,tasted_on=excluded.tasted_on,notes=excluded.notes,drinking_location=excluded.drinking_location,sensory=excluded.sensory,observations=excluded.observations,brewing=excluded.brewing,source=excluded.source,updated_at=now();
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
 insert into photos(id,user_id,tasting_id,storage_path,external_url,sort_order,is_cover) values((p->>'id')::uuid,u,tid,p->>'storage_path',p->>'external_url',coalesce((p->>'sort_order')::int,0),coalesce((p->>'is_cover')::boolean,false));
 end loop;
end $$;

-- One transaction for all imported metadata; no uploaded account/profile CSV data is used.
create function public.import_vivino_archive(payload jsonb) returns void language plpgsql security invoker set search_path=public as $$
declare b jsonb;o jsonb;t jsonb;p jsonb;oid text;u uuid:=auth.uid();
begin
 if u is null then raise exception 'Authentication required';end if;
 if jsonb_array_length(coalesce(payload->'beverages','[]'))>10000 or jsonb_array_length(coalesce(payload->'tastings','[]'))>10000 then raise exception 'Import too large';end if;
 for o in select value from jsonb_array_elements(coalesce(payload->'origins','[]')) loop
 insert into origins(id,user_id,country,region,subregion,display_name,latitude,longitude,precision,confirmed)
 values((o->>'id')::uuid,u,o->>'country',coalesce(o->>'region',''),coalesce(o->>'subregion',''),coalesce(o->>'display_name',''),null,null,'unresolved',false) on conflict(id) do nothing;
 end loop;
 for b in select value from jsonb_array_elements(coalesce(payload->'beverages','[]')) loop
 insert into beverages(id,user_id,category,name,producer,subtype,year,metadata,created_at,updated_at)
 values((b->>'id')::uuid,u,'wine',b->>'name',coalesce(b->>'producer',''),coalesce(b->>'subtype',''),(b->>'year')::int,coalesce(b->'metadata','{}'),now(),now()) on conflict(id) do nothing;
 -- Repeated imports may only add these exact source origin links; they never replace a user's edits.
 for oid in select jsonb_array_elements_text(coalesce(b->'origin_ids','[]')) loop
 insert into beverage_origins(beverage_id,origin_id,user_id) values((b->>'id')::uuid,oid::uuid,u) on conflict do nothing;
 end loop;
 end loop;
 for t in select value from jsonb_array_elements(coalesce(payload->'tastings','[]')) loop
 if t->'source'->>'provider'<>'vivino' or coalesce(t->'source'->>'row_key','')='' then raise exception 'Invalid import provenance';end if;
 insert into tastings(id,user_id,beverage_id,tasted_on,notes,drinking_location,sensory,observations,brewing,source,created_at,updated_at)
 values((t->>'id')::uuid,u,(t->>'beverage_id')::uuid,(t->>'tasted_on')::date,coalesce(t->>'notes',''),coalesce(t->>'drinking_location',''),'{}','{}','{}',t->'source',now(),now()) on conflict(id) do nothing;
 end loop;
 for p in select value from jsonb_array_elements(coalesce(payload->'photos','[]')) loop
 insert into photos(id,user_id,beverage_id,tasting_id,storage_path,external_url,sort_order,is_cover)
 values((p->>'id')::uuid,u,(p->>'beverage_id')::uuid,(p->>'tasting_id')::uuid,null,p->>'external_url',coalesce((p->>'sort_order')::int,0),coalesce((p->>'is_cover')::boolean,false)) on conflict(id) do nothing;
 end loop;
end $$;
revoke all on function public.import_vivino_archive(jsonb) from public,anon;
grant execute on function public.import_vivino_archive(jsonb) to authenticated;
commit;
