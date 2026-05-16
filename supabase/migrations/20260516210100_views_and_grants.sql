-- Read-only views (security_invoker = off so anon reads via views,
-- never tables directly) + anon grants + refresh function.

-- ─── v_plugin_latest ───────────────────────────────────────────────────
create or replace view public.v_plugin_latest with (security_invoker = off) as
select
  p.id          as plugin_id,
  p.name, p.slug, p.category, p.description,
  m.observed_on,
  m.npm_downloads_d7, m.npm_downloads_d30, m.npm_version,
  m.github_stars, m.github_forks, m.rule_count, m.published
from public.plugins p
left join lateral (
  select * from public.plugin_daily_metrics
  where plugin_id = p.id
  order by observed_on desc
  limit 1
) m on true;

-- ─── v_coverage_latest ─────────────────────────────────────────────────
create or replace view public.v_coverage_latest with (security_invoker = off) as
select
  p.id          as plugin_id,
  p.name, p.slug, p.category,
  c.observed_on, c.coverage_pct, c.status, c.total_lines, c.covered_lines
from public.plugins p
left join lateral (
  select * from public.coverage_snapshots
  where plugin_id = p.id
  order by observed_on desc
  limit 1
) c on true;

-- ─── v_ecosystem_aggregate_daily ───────────────────────────────────────
create or replace view public.v_ecosystem_aggregate_daily with (security_invoker = off) as
select
  m.observed_on,
  count(distinct m.plugin_id)                                                        as plugins_observed,
  sum(m.rule_count)                                                                  as total_rules,
  sum(m.npm_downloads_d7)                                                            as downloads_d7_sum,
  sum(m.npm_downloads_d30)                                                           as downloads_d30_sum,
  sum(m.github_stars)                                                                as stars_sum,
  sum(case when p.category = 'security'  then m.rule_count else 0 end)               as security_rules,
  sum(case when p.category = 'quality'   then m.rule_count else 0 end)               as quality_rules,
  sum(case when p.category = 'framework' then m.rule_count else 0 end)               as framework_rules,
  count(distinct case when p.category = 'security'  then p.id end)                   as security_plugins,
  count(distinct case when p.category = 'quality'   then p.id end)                   as quality_plugins,
  count(distinct case when p.category = 'framework' then p.id end)                   as framework_plugins
from public.plugin_daily_metrics m
join public.plugins p on p.id = m.plugin_id
group by m.observed_on;

-- ─── v_external_articles_latest ────────────────────────────────────────
create or replace view public.v_external_articles_latest with (security_invoker = off) as
select id, source, external_id, slug, title, description, author, url,
       published_at, payload, fetched_at
from public.external_articles
order by published_at desc nulls last
limit 50;

-- ─── v_external_tweets_latest ──────────────────────────────────────────
create or replace view public.v_external_tweets_latest with (security_invoker = off) as
select id, tweet_id, payload, photo_url, fetched_at
from public.external_tweets;

-- ─── v_metric_latest ───────────────────────────────────────────────────
create or replace view public.v_metric_latest with (security_invoker = off) as
select distinct on (source, kind, dimension)
  source, kind, dimension, observed_on, value, payload
from public.metric_snapshots
order by source, kind, dimension, observed_on desc;

-- ─── v_storefront_ratchet ──────────────────────────────────────────────
create or replace view public.v_storefront_ratchet with (security_invoker = off) as
select kind, bucket, current_value, updated_at,
       display_label, display_unit, display_icon, display_order,
       description, provenance_url
from public.storefront_ratchet
order by bucket, display_order, kind;

-- ─── v_ratchet_breakdown ───────────────────────────────────────────────
create or replace view public.v_ratchet_breakdown with (security_invoker = off) as
with bucket_totals as (
  select bucket, sum(current_value)::bigint as bucket_total
  from public.storefront_ratchet
  where bucket in ('contributions','engagement')
  group by bucket
),
north_star as (
  select sum(current_value)::bigint as total
  from public.storefront_ratchet
  where bucket in ('contributions','engagement')
)
select
  r.kind, r.bucket, r.current_value,
  r.display_label, r.display_unit, r.display_icon, r.display_order,
  r.description, r.provenance_url,
  bt.bucket_total,
  ns.total                                                  as north_star_total,
  case when bt.bucket_total > 0
       then round(100.0 * r.current_value / bt.bucket_total, 2) else 0 end as pct_of_bucket,
  case when ns.total > 0
       then round(100.0 * r.current_value / ns.total, 2)    else 0 end as pct_of_total,
  r.updated_at
from public.storefront_ratchet r
left join bucket_totals bt on bt.bucket = r.bucket
cross join north_star ns
where r.bucket in ('contributions','engagement')
order by r.bucket, r.display_order, r.kind;

-- ─── v_vercel_analytics_30d ────────────────────────────────────────────
create or replace view public.v_vercel_analytics_30d with (security_invoker = off) as
select kind, dimension, observed_on, value, payload
from public.metric_snapshots
where source = 'vercel-analytics'
  and observed_on >= current_date - interval '30 days'
order by observed_on desc, kind, dimension;

-- ─── Refresh function ──────────────────────────────────────────────────
-- Recomputes every ratchet from the underlying fact tables and UPDATEs
-- storefront_ratchet. The GREATEST trigger guarantees current_value
-- never falls below its previous reading. Called once per day from
-- the docs-data GHA workflow after all ingestion steps complete.
create or replace function public.refresh_storefront_ratchet()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contrib_rules        bigint;
  v_eng_downloads_cum    bigint;
  v_eng_stars            bigint;
  v_eng_page_views_cum   bigint;
  v_eng_devto_reactions  bigint;
  v_eng_tweet_engagement bigint;
  v_contrib_articles     bigint;
  v_contrib_commits      bigint;
  v_contrib_prs          bigint;
  v_contrib_releases     bigint;
  v_north_star           bigint;
begin
  -- contrib_rules_shipped = sum of latest rule_count per plugin
  select coalesce(sum(rule_count), 0) into v_contrib_rules from public.v_plugin_latest where published is true;

  -- eng_downloads_cumulative = sum of npm_downloads_d7 across every observation row, all time
  select coalesce(sum(npm_downloads_d7), 0) into v_eng_downloads_cum from public.plugin_daily_metrics;

  -- eng_github_stars = sum of latest github_stars per plugin
  select coalesce(sum(github_stars), 0) into v_eng_stars from public.v_plugin_latest;

  -- eng_page_views_cumulative = sum of all vercel-analytics page_views rows
  select coalesce(sum(value)::bigint, 0) into v_eng_page_views_cum
  from public.metric_snapshots where source = 'vercel-analytics' and kind = 'page_views';

  -- eng_devto_reactions = sum of positive_reactions_count across external_articles (devto)
  select coalesce(sum((payload->>'positive_reactions_count')::bigint), 0) into v_eng_devto_reactions
  from public.external_articles where source = 'devto';

  -- eng_tweet_engagement = sum of fav+rt+bookmark from tweet payload
  select coalesce(sum(
    coalesce((payload->>'favorite_count')::bigint, 0) +
    coalesce((payload->>'conversation_count')::bigint, 0)
  ), 0) into v_eng_tweet_engagement from public.external_tweets;

  -- contrib_articles_authored: count of external_articles where author matches
  select count(*)::bigint into v_contrib_articles
  from public.external_articles where source = 'devto';
  -- (Filter by author = ofri once we wire the author-attribution step.)

  -- contrib_commits, contrib_prs_merged, contrib_releases come from metric_snapshots
  -- (the github-contributions sync upserts a daily count there).
  select coalesce(value::bigint, 0) into v_contrib_commits
  from public.v_metric_latest where source = 'github-contributions' and kind = 'commits_cumulative' and dimension = '';

  select coalesce(value::bigint, 0) into v_contrib_prs
  from public.v_metric_latest where source = 'github-contributions' and kind = 'prs_merged_cumulative' and dimension = '';

  select coalesce(value::bigint, 0) into v_contrib_releases
  from public.v_metric_latest where source = 'npm-releases' and kind = 'releases_cumulative' and dimension = '';

  -- Apply (trigger enforces GREATEST monotonicity)
  update public.storefront_ratchet set current_value = v_contrib_rules        where kind = 'contrib_rules_shipped';
  update public.storefront_ratchet set current_value = v_eng_downloads_cum    where kind = 'eng_downloads_cumulative';
  update public.storefront_ratchet set current_value = v_eng_stars            where kind = 'eng_github_stars';
  update public.storefront_ratchet set current_value = v_eng_page_views_cum   where kind = 'eng_page_views_cumulative';
  update public.storefront_ratchet set current_value = v_eng_devto_reactions  where kind = 'eng_devto_reactions';
  update public.storefront_ratchet set current_value = v_eng_tweet_engagement where kind = 'eng_tweet_engagement';
  update public.storefront_ratchet set current_value = v_contrib_articles     where kind = 'contrib_articles_authored';
  update public.storefront_ratchet set current_value = v_contrib_commits      where kind = 'contrib_commits';
  update public.storefront_ratchet set current_value = v_contrib_prs          where kind = 'contrib_prs_merged';
  update public.storefront_ratchet set current_value = v_contrib_releases     where kind = 'contrib_releases';

  -- north_star = sum of every contributions + engagement row (after they ratcheted)
  select coalesce(sum(current_value), 0) into v_north_star
  from public.storefront_ratchet
  where bucket in ('contributions','engagement');

  update public.storefront_ratchet set current_value = v_north_star where kind = 'north_star_total';
end;
$$;

-- ─── Prune old snapshots (3-year retention) ────────────────────────────
create or replace function public.prune_old_snapshots()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.plugin_daily_metrics where observed_on < current_date - interval '1095 days';
  delete from public.coverage_snapshots    where observed_on < current_date - interval '1095 days';
  delete from public.peer_health_snapshots where observed_on < current_date - interval '1095 days';
  delete from public.metric_snapshots      where observed_on < current_date - interval '1095 days';
end;
$$;

-- ─── Grants ────────────────────────────────────────────────────────────
grant usage on schema public to anon;
grant select on
  public.v_plugin_latest,
  public.v_coverage_latest,
  public.v_ecosystem_aggregate_daily,
  public.v_external_articles_latest,
  public.v_external_tweets_latest,
  public.v_metric_latest,
  public.v_storefront_ratchet,
  public.v_ratchet_breakdown,
  public.v_vercel_analytics_30d
to anon;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.refresh_storefront_ratchet() to service_role;
grant execute on function public.prune_old_snapshots()        to service_role;
