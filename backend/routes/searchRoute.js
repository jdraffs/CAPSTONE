// backend/routes/searchRoute.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

// Main search endpoint
router.get('/search', async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        results: [],
        message: 'Please enter at least 2 characters to search'
      });
    }

    const searchTerm = `%${query.trim()}%`;
    const results = {
      news: [],
      scholarships: [],
      careers: [],
      nstp: [],
      ojt: [],
      researchExtension: [],
      pages: []
    };

    // Search News
    const newsQuery = `
      SELECT id, title, content, created_at,
        'news' as type, '/public/html/News/all-news.html' as base_url
      FROM news 
      WHERE (title ILIKE $1 OR content ILIKE $2) AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const newsResults = await db.query(newsQuery, [searchTerm, searchTerm]);
    results.news = newsResults.rows.map(item => ({
      ...item,
      url: `${item.base_url}?id=${item.id}`,
      excerpt: truncateText(stripHtml(item.content), 150)
    }));

    // Search Scholarships
    const scholarshipQuery = `
      SELECT id, title, description, provider, status, deadline,
        'scholarship' as type, '/public/html/Students/scholarships.html' as base_url
      FROM scholarships
      WHERE (title ILIKE $1 OR description ILIKE $2 OR provider ILIKE $3) 
        AND status != 'Closed'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const scholarshipResults = await db.query(scholarshipQuery, [searchTerm, searchTerm, searchTerm]);
    results.scholarships = scholarshipResults.rows.map(item => ({
      ...item,
      url: `${item.base_url}?id=${item.id}`,
      excerpt: truncateText(item.description, 150),
      meta: `${item.provider} • ${item.status}`
    }));

    // Search Partner Organizations (Career)
    const careerQuery = `
      SELECT id, name as title, description, category, website_url,
        'career' as type, '/public/html/Students/careers.html' as base_url
      FROM partner_organizations
      WHERE (name ILIKE $1 OR description ILIKE $2) AND status = 'active'
      ORDER BY name
      LIMIT 10
    `;
    const careerResults = await db.query(careerQuery, [searchTerm, searchTerm]);
    results.careers = careerResults.rows.map(item => ({
      ...item,
      url: item.website_url || item.base_url,
      excerpt: truncateText(item.description, 150),
      meta: item.category
    }));

    // Search NSTP Posts
    const nstpQuery = `
      SELECT id, title, content, created_at,
        'nstp' as type, '/public/html/Students/nstp-public.html' as base_url
      FROM nstp_posts
      WHERE (title ILIKE $1 OR content ILIKE $2) AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const nstpResults = await db.query(nstpQuery, [searchTerm, searchTerm]);
    results.nstp = nstpResults.rows.map(item => ({
      ...item,
      url: `${item.base_url}#post-${item.id}`,
      excerpt: truncateText(stripHtml(item.content), 150)
    }));

    // Search OJT Posts
    const ojtQuery = `
      SELECT id, title, content, created_at,
        'ojt' as type, '/public/html/Students/ojt-public.html' as base_url
      FROM ojt_posts
      WHERE (title ILIKE $1 OR content ILIKE $2) AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const ojtResults = await db.query(ojtQuery, [searchTerm, searchTerm]);
    results.ojt = ojtResults.rows.map(item => ({
      ...item,
      url: `${item.base_url}#post-${item.id}`,
      excerpt: truncateText(stripHtml(item.content), 150)
    }));

    // Search Research & Extension Posts
    const researchQuery = `
      SELECT id, title, content, created_at,
        'research' as type, '/public/html/About/research&extension-public.html' as base_url
      FROM researchextension_posts
      WHERE (title ILIKE $1 OR content ILIKE $2) AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const researchResults = await db.query(researchQuery, [searchTerm, searchTerm]);
    results.researchExtension = researchResults.rows.map(item => ({
      ...item,
      url: `${item.base_url}#post-${item.id}`,
      excerpt: truncateText(stripHtml(item.content), 150)
    }));

    // Static pages search
    const staticPages = getStaticPages();
    results.pages = staticPages.filter(page => 
      page.title.toLowerCase().includes(query.toLowerCase()) ||
      page.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase()))
    );

    // Calculate total results
    const totalResults = 
      results.news.length +
      results.scholarships.length +
      results.careers.length +
      results.nstp.length +
      results.ojt.length +
      results.researchExtension.length +
      results.pages.length;

    res.json({
      success: true,
      query: query,
      totalResults,
      results
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: error.message
    });
  }
});

// Helper function to truncate text
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// Helper function to strip HTML tags
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Static pages configuration
function getStaticPages() {
  return [
    {
      title: 'Home',
      url: '/public/index.html',
      description: 'Welcome to PUP Parañaque Campus - Mula Sa\'yo, Para Sa Bayan',
      keywords: ['home', 'main', 'pup', 'paranaque', 'campus', 'university'],
      type: 'page'
    },
    {
      title: 'History',
      url: '/public/html/About/history.html',
      description: 'Learn about the rich history of PUP Parañaque Campus',
      keywords: ['history', 'about', 'background', 'establishment', 'pamantasang bayan'],
      type: 'page'
    },
    {
      title: 'Administrative Officials',
      url: '/public/html/About/administrativeofficials.html',
      description: 'Meet our dedicated administrative officials',
      keywords: ['officials', 'administration', 'director', 'faculty', 'staff', 'atty salao'],
      type: 'page'
    },
    {
      title: 'Vicinity Map',
      url: '/public/html/About/vicinitymap.html',
      description: 'Find PUP Parañaque Campus location',
      keywords: ['map', 'location', 'address', 'directions', 'wawa', 'santo niño'],
      type: 'page'
    },
    {
      title: 'Admission',
      url: '/public/html/Admission/admission.html',
      description: 'Apply to PUP Parañaque - admission information and requirements',
      keywords: ['admission', 'apply', 'requirements', 'enrollment', 'pupcet', 'iapply'],
      type: 'page'
    },
    {
      title: 'Students Portal',
      url: '/public/html/Students/students.html',
      description: 'Access student services and resources',
      keywords: ['students', 'portal', 'services', 'resources'],
      type: 'page'
    },
    {
      title: 'Campus Life',
      url: '/public/html/CampusLife/campus-life.html',
      description: 'Discover student life at PUP Parañaque',
      keywords: ['campus life', 'organizations', 'facilities', 'student activities', 'aicts', 'scene', 'hmsoc', 'pasoa'],
      type: 'page'
    },
    {
      title: 'Alumni Survey',
      url: '/public/html/Alumni&Services/alumni-survey.html',
      description: 'Alumni employment survey and services',
      keywords: ['alumni', 'survey', 'employment', 'graduates'],
      type: 'page'
    },
    {
      title: 'Contact & Support',
      url: '/public/html/Contact&Support/QuickHelp&Chatbot.html',
      description: 'Get in touch with PUP Parañaque',
      keywords: ['contact', 'support', 'help', 'chatbot', 'inquiry'],
      type: 'page'
    },
    {
      title: 'Service Feedback',
      url: '/public/html/Students/feedback.html',
      description: 'Provide feedback on campus services',
      keywords: ['feedback', 'service', 'evaluation', 'rating'],
      type: 'page'
    },
    {
      title: 'Digital Certificate Request',
      url: '/public/html/Students/certificate-request.html',
      description: 'Request digital certificates online',
      keywords: ['certificate', 'request', 'digital', 'document'],
      type: 'page'
    }
  ];
}

export default router;