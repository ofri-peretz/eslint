import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

// Load environment variables from .env
config();

const API_KEY = process.env.DEV_TO_API_KEY;
const today = new Date().toISOString().split('T')[0];
const OUTPUT_DIR = path.join("/Users/ofri/repos/ofriperetz.dev/eslint/distribution", `remote-articles-${today}`);

if (!API_KEY) {
  console.error('❌ Error: DEV_TO_API_KEY is not defined in .env or environment variables.');
  process.exit(1);
}

// 🎯 DEV.TO POWER HANDLES (Founders, Staff, and Top Moderators)
const POWER_HANDLES = {
  'jess': 'Jess Lee (Co-Founder & COO)',
  'ben': 'Ben Halpern (Co-Founder & Co-CEO)',
  'peter': 'Peter Kim Frank (Co-Founder & Co-CEO)',
  'citizen428': 'Michael Kohl (Staff)',
  'sloan': 'Sloan (Staff/Moderator)',
  'devteam': 'The DEV Team (Official)',
  'forem': 'Forem Official'
};

async function fetchComments(articleId) {
  try {
    const response = await fetch(`https://dev.to/api/comments?a_id=${articleId}`, {
      headers: { "Accept": "application/vnd.forem.api-v1+json" }
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.error(`Error fetching comments for ${articleId}:`, err);
    return [];
  }
}

function scanForPowerEngagement(comments, findings = []) {
  for (const comment of comments) {
    const username = comment.user?.username;
    if (POWER_HANDLES[username]) {
      findings.push({
        handle: username,
        role: POWER_HANDLES[username],
        comment_id: comment.id_code,
        body: comment.body_html?.substring(0, 200) + "...",
        created_at: comment.created_at
      });
    }
    if (comment.children && comment.children.length > 0) {
      scanForPowerEngagement(comment.children, findings);
    }
  }
  return findings;
}

async function fetchAllArticles() {
  console.log('🚀 Starting Deep Platform Engagement Audit...');
  const response = await fetch("https://dev.to/api/articles/me/all?per_page=1000", {
    headers: {
      "api-key": API_KEY,
      "Accept": "application/vnd.forem.api-v1+json"
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch articles (${response.status}): ${errorText}`);
  }
  
  const articles = await response.json();
  console.log(`Found ${articles.length} articles.`);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const ecosystemStats = {
    total_articles: articles.length,
    series: {},
    tags: {},
    release_calendar: { days_of_week: { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 } },
    release_time_distribution: Array(48).fill(0),
    engagement: {
      total_views: 0,
      total_positive_reactions: 0,
      total_comments: 0,
      total_engagement_score: 0,
      total_word_count: 0,
      staff_interactions_found: 0
    },
    articles_data: [],
    staff_engagement_log: []
  };

  for (const article of articles) {
    console.log(`Processing article: ${article.title} (${article.slug})`);
    
    const rawDateStr = article.published_at || article.created_at;
    const publishedDate = new Date(rawDateStr);
    const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][publishedDate.getUTCDay()];
    
    const views = article.page_views_count || 0;
    const reactions = article.public_reactions_count || 0; 
    const positiveReactions = article.positive_reactions_count || 0;
    const commentsCount = article.comments_count || 0;
    const tagsArr = article.tag_list || [];
    const bodyMarkdown = article.body_markdown || "";
    
    // Deep Scan for Staff Engagement if comments exist
    let staffInteractions = [];
    if (commentsCount > 0) {
      const commentsData = await fetchComments(article.id);
      staffInteractions = scanForPowerEngagement(commentsData);
    }

    const wordCount = bodyMarkdown.split(/\s+/).filter(w => w.length > 0).length;
    const viralCoefficient = views > 0 ? ((reactions + commentsCount) / views) : 0;
    const conversionEfficiency = views > 0 ? (positiveReactions / views) : 0;

    const frontmatterMatch = bodyMarkdown.match(/^---[\s\S]*?\n([\s\S]*?)\n---/);
    const bodyFrontmatter = {};
    if (frontmatterMatch) {
      frontmatterMatch[1].split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const key = line.slice(0, colonIndex).trim();
          const value = line.slice(colonIndex + 1).trim();
          bodyFrontmatter[key] = value.replace(/^["']|["']$/g, '').trim();
        }
      });
    }

    const seriesName = bodyFrontmatter.series || "Uncategorized";
    const canonicalUrl = article.canonical_url || bodyFrontmatter.canonical_url || "";

    // Aggregate
    ecosystemStats.series[seriesName] = (ecosystemStats.series[seriesName] || 0) + 1;
    tagsArr.forEach(t => ecosystemStats.tags[t] = (ecosystemStats.tags[t] || 0) + 1);
    ecosystemStats.release_calendar.days_of_week[dayOfWeek]++;
    
    const binIndex = Math.floor(((publishedDate.getUTCHours() * 60) + publishedDate.getUTCMinutes()) / 30);
    ecosystemStats.release_time_distribution[binIndex]++;

    ecosystemStats.engagement.total_views += views;
    ecosystemStats.engagement.total_positive_reactions += positiveReactions;
    ecosystemStats.engagement.total_comments += commentsCount;
    ecosystemStats.engagement.total_engagement_score += (positiveReactions + commentsCount);
    ecosystemStats.engagement.total_word_count += wordCount;
    ecosystemStats.engagement.staff_interactions_found += staffInteractions.length;

    if (staffInteractions.length > 0) {
      ecosystemStats.staff_engagement_log.push({
        article_title: article.title,
        article_slug: article.slug,
        interactions: staffInteractions
      });
    }

    const metadata = {
      ...article,
      industry_standards: {
        viral_coefficient: viralCoefficient.toFixed(4),
        conversion_efficiency_rate: (conversionEfficiency * 100).toFixed(2) + "%",
        word_count: wordCount
      },
      staff_engagement_audit: {
        has_staff_interaction: staffInteractions.length > 0,
        interactions: staffInteractions
      }
    };

    ecosystemStats.articles_data.push({
      slug: article.slug,
      title: article.title,
      views,
      engagement_score: positiveReactions + commentsCount,
      conversion_efficiency: conversionEfficiency,
      series: seriesName,
      tags: tagsArr,
      staff_interaction_count: staffInteractions.length
    });

    const articleDir = path.join(OUTPUT_DIR, article.slug);
    if (!fs.existsSync(articleDir)) fs.mkdirSync(articleDir, { recursive: true });
    fs.writeFileSync(path.join(articleDir, 'full-advanced-metadata.json'), JSON.stringify(metadata, null, 2));
    fs.writeFileSync(path.join(articleDir, 'article.md'), bodyMarkdown);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    founder_staff_audit: {
      total_staff_engagements: ecosystemStats.engagement.staff_interactions_found,
      engaged_articles_count: ecosystemStats.staff_engagement_log.length,
      staff_interaction_log: ecosystemStats.staff_engagement_log
    },
    platform_visibility_patterns: {
      best_day_to_publish: Object.entries(ecosystemStats.release_calendar.days_of_week).sort((a,b) => b[1] - a[1])[0][0],
      peak_engagement_window_utc: ecosystemStats.release_time_distribution.map((count, i) => ({
        time: `${Math.floor(i / 2).toString().padStart(2, '0')}:${(i % 2 === 0 ? '00' : '30')}`,
        count 
      })).sort((a,b) => b.count - a.count).slice(0, 3)
    },
    strategic_insights: {
      high_converting_top_tags: Object.keys(ecosystemStats.tags).map(t => {
        const tagArts = ecosystemStats.articles_data.filter(a => a.tags.includes(t));
        const avgConv = tagArts.reduce((sum, a) => sum + a.conversion_efficiency, 0) / tagArts.length;
        return { tag: t, avg_conv: (avgConv * 100).toFixed(2) + "%" };
      }).sort((a, b) => parseFloat(b.avg_conv) - parseFloat(a.avg_conv)).slice(0, 5)
    }
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'ecosystem-summary.json'), JSON.stringify(summary, null, 2));
  console.log('✅ Deep Engagement Audit Complete. Founders & Staff interactions tracked.');
}

fetchAllArticles().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
