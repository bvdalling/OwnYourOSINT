const path = require('path');
const fs = require('fs').promises;
const ejs = require('ejs');

const projectRoot = path.resolve(__dirname);
const viewsDir = path.join(projectRoot, 'views');
const outputDir = path.join(projectRoot, 'dist');
const siteAssetsDir = path.join(projectRoot, 'site', 'assets');

// Routes configuration matching server.js
const routes = [
    { path: '/', template: 'pages/home', outputDir: '', outputFile: 'index.html', title: 'Security & Privacy Toolkit', description: 'Practical security and privacy guidance: checklists, device hardening, identity protection, and reporting resources.', activePage: 'home' },
    { path: '/basics', template: 'pages/basics', outputDir: 'basics', outputFile: 'index.html', title: 'Basics · Security & Privacy Toolkit', description: 'Security and privacy basics: threat modeling, account security, and reducing your public footprint.', activePage: 'basics' },
    { path: '/device-security', template: 'pages/device-security', outputDir: 'device-security', outputFile: 'index.html', title: 'Device Security · Security & Privacy Toolkit', description: 'Phone and computer hardening checklists: updates, lock screen, MFA, backups, and what to do if you feel monitored.', activePage: 'device-security' },
    { path: '/privacy', template: 'pages/privacy', outputDir: 'privacy', outputFile: 'index.html', title: 'Privacy · Security & Privacy Toolkit', description: 'Privacy and identity protection: account recovery, credit freezes, data brokers, and safer social sharing.', activePage: 'privacy' },
    { path: '/local-resources', template: 'pages/local-resources', outputDir: 'local-resources', outputFile: 'index.html', title: 'Resources · Security & Privacy Toolkit', description: 'Reporting, recovery, and support resources for common security and privacy incidents.', activePage: 'local-resources' },
    { path: '/downloads', template: 'pages/downloads', outputDir: 'downloads', outputFile: 'index.html', title: 'Downloads · Security & Privacy Toolkit', description: 'Downloadable resources included with this project.', activePage: 'downloads' },
    { path: '/about', template: 'pages/about', outputDir: 'about', outputFile: 'index.html', title: 'About · Security & Privacy Toolkit', description: 'About this project: goals, scope, disclaimers, and credits for included resources.', activePage: 'about' },
];

async function ensureDir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

async function copyDir(src, dest) {
    try {
        await fs.access(src);
        await ensureDir(dest);
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await copyDir(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    } catch (err) {
        // Directory doesn't exist, skip silently
        if (err.code !== 'ENOENT') {
            console.warn(`Warning: Could not copy ${src}: ${err.message}`);
        }
    }
}

async function copyPDFs() {
    const pdfsDir = path.join(outputDir, 'pdfs');
    await ensureDir(pdfsDir);

    const files = await fs.readdir(projectRoot);
    for (const file of files) {
        if (file.toLowerCase().endsWith('.pdf')) {
            const srcPath = path.join(projectRoot, file);
            const destPath = path.join(pdfsDir, file);
            await fs.copyFile(srcPath, destPath);
            console.log(`Copied PDF: ${file}`);
        }
    }
}

async function renderPage(route) {
    const data = {
        title: route.title,
        description: route.description,
        activePage: route.activePage,
    };

    // First render the page content (body)
    const pagePath = path.join(viewsDir, `${route.template}.ejs`);
    const body = await ejs.renderFile(pagePath, data, {
        views: [viewsDir],
    });

    // Then render the layout with the body
    const layoutPath = path.join(viewsDir, 'layouts/main.ejs');
    const html = await ejs.renderFile(layoutPath, { ...data, body }, {
        views: [viewsDir],
    });

    // Calculate relative path prefix based on directory depth
    // Root page (outputDir === '') uses './', subdirectories use '../'
    const depth = route.outputDir ? 1 : 0;
    const relativePrefix = depth === 0 ? './' : '../';

    // Update asset paths to be relative
    let finalHtml = html.replace(/href="\/assets\//g, `href="${relativePrefix}assets/`);
    finalHtml = finalHtml.replace(/src="\/assets\//g, `src="${relativePrefix}assets/`);
    // Update PDF paths to be relative
    finalHtml = finalHtml.replace(/href="\/pdfs\//g, `href="${relativePrefix}pdfs/`);
    // Update internal links to point to directories
    finalHtml = finalHtml.replace(/href="\/([^"]*)"/g, (match, p1) => {
        // Skip external URLs, anchors, and assets
        if (match.includes('://') || match.includes('#') || match.includes('/assets/') || match.includes('/pdfs/')) {
            return match;
        }
        // Home page
        if (p1 === '') {
            return depth === 0 ? 'href="./"' : 'href="../"';
        }
        // Other pages - point to their directory
        if (!p1.includes('.')) {
            return `href="${relativePrefix}${p1}/"`;
        }
        return match;
    });

    return finalHtml;
}

async function build() {
    console.log('Building static site...');

    // Clean and create output directory
    try {
        await fs.rm(outputDir, { recursive: true, force: true });
    } catch (err) {
        // Directory doesn't exist, that's fine
    }
    await ensureDir(outputDir);

    // Copy static assets
    const assetsOutputDir = path.join(outputDir, 'assets');
    await copyDir(siteAssetsDir, assetsOutputDir);
    if (await fs.access(siteAssetsDir).then(() => true).catch(() => false)) {
        console.log('Copied static assets');
    }

    // Copy PDFs
    await copyPDFs();

    // Render all pages
    for (const route of routes) {
        try {
            const html = await renderPage(route);
            // Create output directory if needed
            const pageOutputDir = route.outputDir ? path.join(outputDir, route.outputDir) : outputDir;
            await ensureDir(pageOutputDir);
            const outputPath = path.join(pageOutputDir, route.outputFile);
            await fs.writeFile(outputPath, html, 'utf8');
            const outputRelative = route.outputDir ? `${route.outputDir}/${route.outputFile}` : route.outputFile;
            console.log(`Rendered: ${outputRelative}`);
        } catch (err) {
            console.error(`Error rendering ${route.template}:`, err);
            throw err;
        }
    }

    console.log(`\n✓ Build complete! Output directory: ${outputDir}`);
}

build().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});

