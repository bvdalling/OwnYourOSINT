const path = require('path');
const fs = require('fs').promises;
const matter = require('gray-matter');
const { marked } = require('marked');

const projectRoot = path.resolve(__dirname, '..');
const postsDir = path.join(projectRoot, 'posts');

let postsCache = null;
let cacheTimestamp = null;

// Configure marked with custom renderer to match site styling
const renderer = new marked.Renderer();

// Headings
// Skip h1 since the title is already displayed in the template header
// Convert h1 to h2 to maintain hierarchy
renderer.heading = (text, level) => {
  // Convert h1 to h2 since title is already shown in header
  const actualLevel = level === 1 ? 2 : level;
  const classes = {
    1: 'text-3xl font-extrabold tracking-tight sm:text-4xl mt-8 mb-4',
    2: 'text-xl font-bold mt-10 mb-4',
    3: 'text-lg font-bold mt-6 mb-3',
    4: 'text-base font-bold mt-4 mb-2',
  };
  const classList = classes[actualLevel] || 'text-base font-bold mt-4 mb-2';
  return `<h${actualLevel} class="${classList} text-slate-900 dark:text-slate-100">${text}</h${actualLevel}>`;
};

// Paragraphs
renderer.paragraph = (text) => {
  return `<p class="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">${text}</p>`;
};

// Links
renderer.link = (href, title, text) => {
  const titleAttr = title ? ` title="${title}"` : '';
  const isExternal = href.startsWith('http');
  const target = isExternal ? ' target="_blank" rel="noreferrer"' : '';
  return `<a href="${href}"${titleAttr}${target} class="font-semibold underline underline-offset-4 text-slate-900 hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300">${text}</a>`;
};

// Lists
renderer.list = (body, ordered) => {
  const tag = ordered ? 'ol' : 'ul';
  const listClass = ordered
    ? 'mt-4 space-y-2 text-base text-slate-700 dark:text-slate-300 list-decimal ml-6'
    : 'mt-4 space-y-2 text-base text-slate-700 dark:text-slate-300 list-disc ml-6';
  return `<${tag} class="${listClass}">${body}</${tag}>`;
};

renderer.listitem = (text) => {
  return `<li class="leading-relaxed pl-2">${text}</li>`;
};

// Code
renderer.code = (code, language) => {
  const langClass = language ? `language-${language} ` : '';
  return `<pre class="mt-4 mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 overflow-x-auto dark:border-slate-800 dark:bg-slate-900"><code class="${langClass}text-sm text-slate-900 dark:text-slate-100">${code}</code></pre>`;
};

renderer.codespan = (code) => {
  return `<code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-900 dark:bg-slate-800 dark:text-slate-100">${code}</code>`;
};

// Blockquotes
renderer.blockquote = (quote) => {
  return `<blockquote class="mt-4 border-l-4 border-slate-300 pl-4 italic text-slate-600 dark:border-slate-700 dark:text-slate-400">${quote}</blockquote>`;
};

// Images
renderer.image = (href, title, text) => {
  const titleAttr = title ? ` title="${title}"` : '';
  const alt = text || '';
  return `<figure class="mt-6 mb-6"><img src="${href}" alt="${alt}"${titleAttr} class="rounded-lg border border-slate-200 dark:border-slate-800 max-w-full h-auto shadow-sm" loading="lazy" />${title ? `<figcaption class="mt-2 text-sm text-center text-slate-600 dark:text-slate-400 italic">${title}</figcaption>` : ''}</figure>`;
};

// Horizontal rule
renderer.hr = () => {
  return '<hr class="my-8 border-slate-200 dark:border-slate-800" />';
};

// Strong and emphasis
renderer.strong = (text) => {
  return `<strong class="font-bold text-slate-900 dark:text-slate-100">${text}</strong>`;
};

renderer.em = (text) => {
  return `<em class="italic">${text}</em>`;
};

// Tables
renderer.table = (header, body) => {
  return `<div class="mt-4 mb-4 overflow-x-auto"><table class="min-w-full border-collapse border border-slate-200 dark:border-slate-800"><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
};

renderer.tablerow = (content) => {
  return `<tr class="border-b border-slate-200 dark:border-slate-800">${content}</tr>`;
};

renderer.tablecell = (content, flags) => {
  const tag = flags.header ? 'th' : 'td';
  const cellClass = flags.header
    ? 'px-4 py-2 text-left font-bold text-slate-900 bg-slate-50 dark:bg-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800'
    : 'px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800';
  return `<${tag} class="${cellClass}">${content}</${tag}>`;
};

// Custom video renderer - handle video links in markdown
// Supports: ![video](url) or ![video](url "title")
// Also handles direct video URLs in paragraphs
const originalParagraph = renderer.paragraph;
renderer.paragraph = (text) => {
  // Check if paragraph contains a video URL (YouTube, Vimeo, or direct video file)
  const videoRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/|.*\.(mp4|webm|ogg)(?:\?.*)?)/gi;
  const videoMatch = text.match(videoRegex);

  if (videoMatch) {
    const videoUrl = videoMatch[0];
    let videoHtml = '';

    // YouTube
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1] || videoUrl.match(/youtu\.be\/([^&\s]+)/)?.[1];
      if (videoId) {
        videoHtml = `<div class="mt-6 mb-6 aspect-video rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"><iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        // Remove the video URL from the paragraph text
        text = text.replace(videoRegex, '').trim();
        if (text) {
          return `${originalParagraph(text)}${videoHtml}`;
        }
        return videoHtml;
      }
    }

    // Vimeo
    if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        videoHtml = `<div class="mt-6 mb-6 aspect-video rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"><iframe class="w-full h-full" src="https://player.vimeo.com/video/${videoId}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
        text = text.replace(videoRegex, '').trim();
        if (text) {
          return `${originalParagraph(text)}${videoHtml}`;
        }
        return videoHtml;
      }
    }

    // Direct video files
    if (videoUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
      videoHtml = `<div class="mt-6 mb-6 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"><video class="w-full" controls><source src="${videoUrl}" type="video/${videoUrl.match(/\.(mp4|webm|ogg)/i)?.[1] || 'mp4'}">Your browser does not support the video tag.</video></div>`;
      text = text.replace(videoRegex, '').trim();
      if (text) {
        return `${originalParagraph(text)}${videoHtml}`;
      }
      return videoHtml;
    }
  }

  return originalParagraph(text);
};

// Configure marked options
marked.setOptions({
  renderer,
  breaks: false,
  gfm: true,
});

/**
 * Generate a URL slug from a filename
 */
function slugFromFilename(filename) {
  return filename.replace(/\.md$/, '').toLowerCase();
}

/**
 * Parse a markdown file and extract frontmatter + content
 */
async function parsePost(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    const filename = path.basename(filePath);
    const slug = slugFromFilename(filename);

    // Parse date if it's a string
    let date = data.date;
    if (typeof date === 'string') {
      date = new Date(date);
    }

    return {
      slug,
      title: data.title || slug,
      date: date || new Date(),
      description: data.description || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      coverImage: data.coverImage || data.cover || null,
      content: content.trim(),
      html: marked(content.trim()),
    };
  } catch (error) {
    console.error(`Error parsing post ${filePath}:`, error);
    return null;
  }
}

/**
 * Load all blog posts from the posts directory
 */
async function loadPosts() {
  const now = Date.now();

  // Return cached posts if cache is still valid (5 minutes)
  if (postsCache && cacheTimestamp && (now - cacheTimestamp) < 300000) {
    return postsCache;
  }

  try {
    const files = await fs.readdir(postsDir);
    const markdownFiles = files.filter((f) => f.endsWith('.md'));

    const posts = await Promise.all(
      markdownFiles.map((file) => {
        const filePath = path.join(postsDir, file);
        return parsePost(filePath);
      })
    );

    // Filter out null results and sort by date (newest first)
    const validPosts = posts
      .filter((post) => post !== null)
      .sort((a, b) => b.date - a.date);

    postsCache = validPosts;
    cacheTimestamp = now;

    return validPosts;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Posts directory doesn't exist yet, return empty array
      return [];
    }
    console.error('Error loading posts:', error);
    return [];
  }
}

/**
 * Get a single post by slug
 */
async function getPost(slug) {
  const posts = await loadPosts();
  return posts.find((post) => post.slug === slug) || null;
}

/**
 * Search posts by title and description
 */
async function searchPosts(query) {
  const posts = await loadPosts();
  if (!query || query.trim() === '') {
    return posts;
  }

  const searchTerm = query.toLowerCase();
  return posts.filter((post) => {
    const titleMatch = post.title.toLowerCase().includes(searchTerm);
    const descMatch = post.description.toLowerCase().includes(searchTerm);
    return titleMatch || descMatch;
  });
}

/**
 * Get posts with pagination
 */
async function getPosts(offset = 0, limit = 10) {
  const posts = await loadPosts();
  return posts.slice(offset, offset + limit);
}

module.exports = {
  loadPosts,
  getPost,
  searchPosts,
  getPosts,
};

