const express = require('express');
const path = require('path');
const fs = require('fs');

const expressLayouts = require('express-ejs-layouts');
const blog = require('./blog');

const app = express();

const projectRoot = path.resolve(__dirname, '..');
const viewsDir = path.join(projectRoot, 'views');
const siteAssetsDir = path.join(projectRoot, 'site', 'assets');

app.set('views', viewsDir);
app.set('view engine', 'ejs');

app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Static assets (CSS/JS) from the existing site folder.
app.use('/assets', express.static(siteAssetsDir));

// Redirect old .html URLs to clean routes.
app.get('/index.html', (_req, res) => res.redirect(301, '/'));
app.get('/basics.html', (_req, res) => res.redirect(301, '/basics'));
app.get('/device-security.html', (_req, res) => res.redirect(301, '/device-security'));
app.get('/privacy.html', (_req, res) => res.redirect(301, '/privacy'));
app.get('/local-resources.html', (_req, res) => res.redirect(301, '/local-resources'));
app.get('/downloads.html', (_req, res) => res.redirect(301, '/downloads'));
app.get('/tools.html', (_req, res) => res.redirect(301, '/tools'));
app.get('/blog.html', (_req, res) => res.redirect(301, '/blog'));
app.get('/about.html', (_req, res) => res.redirect(301, '/about'));

// Safe PDF serving: only allow PDFs from the assets directory by filename.
app.get('/pdfs/:filename', async (req, res) => {
  const requested = req.params.filename;
  const safe = path.basename(requested);

  if (safe !== requested) {
    return res.status(400).send('Bad request');
  }

  if (!safe.toLowerCase().endsWith('.pdf')) {
    return res.status(404).send('Not found');
  }

  const pdfPath = path.join(projectRoot, 'assets', safe);

  try {
    await fs.promises.access(pdfPath, fs.constants.R_OK);
  } catch (_err) {
    return res.status(404).send('Not found');
  }

  return res.sendFile(pdfPath);
});

// Clean routes.
app.get('/', (_req, res) => {
  res.render('pages/home', {
    title: 'Security & Privacy Toolkit',
    description:
      'Practical security and privacy guidance: checklists, device hardening, identity protection, and reporting resources.',
    activePage: 'home',
  });
});

app.get('/basics', (_req, res) => {
  res.render('pages/basics', {
    title: 'Basics · Security & Privacy Toolkit',
    description:
      'Security and privacy basics: threat modeling, account security, and reducing your public footprint.',
    activePage: 'basics',
  });
});

app.get('/device-security', (_req, res) => {
  res.render('pages/device-security', {
    title: 'Device Security · Security & Privacy Toolkit',
    description:
      'Phone and computer hardening checklists: updates, lock screen, MFA, backups, and what to do if you feel monitored.',
    activePage: 'device-security',
  });
});

app.get('/privacy', (_req, res) => {
  res.render('pages/privacy', {
    title: 'Privacy · Security & Privacy Toolkit',
    description:
      'Privacy and identity protection: account recovery, credit freezes, data brokers, and safer social sharing.',
    activePage: 'privacy',
  });
});

app.get('/local-resources', (_req, res) => {
  res.render('pages/local-resources', {
    title: 'Resources · Security & Privacy Toolkit',
    description:
      'Reporting, recovery, and support resources for common security and privacy incidents.',
    activePage: 'local-resources',
  });
});

app.get('/downloads', (_req, res) => {
  res.render('pages/downloads', {
    title: 'Downloads · Security & Privacy Toolkit',
    description: 'Downloadable resources included with this project.',
    activePage: 'downloads',
  });
});

app.get('/tools', (_req, res) => {
  res.render('pages/tools', {
    title: 'Tools · Security & Privacy Toolkit',
    description: 'Useful tools and resources for security and privacy research, OSINT, and digital forensics.',
    activePage: 'tools',
  });
});

app.get('/about', (_req, res) => {
  res.render('pages/about', {
    title: 'About · Security & Privacy Toolkit',
    description:
      'About this project: goals, scope, disclaimers, and credits for included resources.',
    activePage: 'about',
  });
});

// Blog routes
app.get('/blog', async (_req, res) => {
  res.render('pages/blog/index', {
    title: 'Blog · Security & Privacy Toolkit',
    description: 'Security and privacy insights, guides, and updates.',
    activePage: 'blog',
  });
});

app.get('/blog/:slug', async (req, res) => {
  const post = await blog.getPost(req.params.slug);
  if (!post) {
    return res.status(404).render('pages/blog/post', {
      title: 'Post Not Found · Security & Privacy Toolkit',
      description: 'The blog post you\'re looking for doesn\'t exist.',
      activePage: 'blog',
      post: null,
    });
  }
  res.render('pages/blog/post', {
    title: `${post.title} · Security & Privacy Toolkit`,
    description: post.description,
    activePage: 'blog',
    post,
  });
});

// Blog API endpoints
app.get('/api/blog/search', async (req, res) => {
  const query = req.query.q || '';
  const results = await blog.searchPosts(query);
  // Return only metadata for search results
  res.json(
    results.map((post) => ({
      slug: post.slug,
      title: post.title,
      description: post.description,
      date: post.date.toISOString(),
      tags: post.tags,
      coverImage: post.coverImage || null,
    }))
  );
});

app.get('/api/blog/posts', async (req, res) => {
  const offset = parseInt(req.query.offset || '0', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const posts = await blog.getPosts(offset, limit);
  // Return only metadata for listing
  res.json({
    posts: posts.map((post) => ({
      slug: post.slug,
      title: post.title,
      description: post.description,
      date: post.date.toISOString(),
      tags: post.tags,
      coverImage: post.coverImage || null,
    })),
  });
});

// Basic 404 (keeps output clean for missing routes).
app.use((_req, res) => {
  res.status(404).send('Not found');
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});


