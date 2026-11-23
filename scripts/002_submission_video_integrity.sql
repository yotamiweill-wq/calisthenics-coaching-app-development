begin;
create unique index submissions_video_path_unique on public.submissions(video_path);

create function public.verify_submission_video() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'submissions' and o.name = new.video_path
      and o.owner_id = new.trainee_id::text
      and split_part(o.name, '/', 1) = new.trainee_id::text
      and not o.is_delete_marker and o.archived_at is null
      and o.metadata->>'mimetype' like 'video/%'
      and (split_part(o.name, '/', 2) <> 'uploads' or o.created_at > clock_timestamp() - interval '24 hours')
  ) then
    raise exception using errcode = 'P0002', message = 'הסרטון לא נמצא או שפג תוקף ההעלאה. יש להעלות אותו מחדש.';
  end if;
  return new;
end;
$$;
revoke all on function public.verify_submission_video() from public, anon, authenticated;
create trigger submissions_verify_object before insert or update of trainee_id, video_path on public.submissions for each row execute function public.verify_submission_video();

create function public.expired_submission_uploads() returns table(path text)
language sql stable security definer set search_path = '' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'submissions' and o.name like o.owner_id || '/uploads/%'
    and split_part(o.name, '/', 1) = o.owner_id and split_part(o.name, '/', 2) = 'uploads'
    and o.archived_at is null and not o.is_delete_marker
    and o.created_at < now() - interval '48 hours'
    and not exists (select 1 from public.submissions s where s.video_path = o.name)
  order by o.created_at limit 500;
$$;
revoke all on function public.expired_submission_uploads() from public, anon, authenticated;
grant execute on function public.expired_submission_uploads() to service_role;
commit;
