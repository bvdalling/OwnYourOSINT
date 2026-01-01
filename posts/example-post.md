---
title: "Welcome to the Blog"
date: 2024-01-15
description: "This is an example blog post to demonstrate the blog system functionality."
tags: ["security", "privacy", "osint"]
coverImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=600&fit=crop"
---

This is an example blog post that demonstrates how the blog system works. You can write your posts in Markdown format with YAML frontmatter.

## Features

The blog system supports:

- **Markdown rendering** - Write your posts in Markdown
- **YAML frontmatter** - Add metadata like title, date, description, and tags
- **Search functionality** - Search posts by title and description
- **Infinite scroll** - Automatically loads more posts as you scroll
- **Tag support** - Organize posts with tags

## Getting Started

To create a new blog post:

1. Create a new `.md` file in the `posts/` directory
2. Add YAML frontmatter with at least a `title` and `date`
3. Write your content in Markdown below the frontmatter
4. The post will automatically appear on the blog listing page

## Example Frontmatter

```yaml
---
title: "Your Post Title"
date: 2024-01-15
description: "A brief description of your post"
tags: ["tag1", "tag2"]
coverImage: "https://example.com/image.jpg"  # Optional cover image
---
```

## Media Support

The blog system supports various media types:

### Images

You can include images in your markdown:

![Example image](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=400&fit=crop "A beautiful security-themed image")

### Videos

You can embed videos from YouTube, Vimeo, or direct video files:

- YouTube: Just paste the URL in your markdown (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
- Vimeo: Paste the Vimeo URL (e.g., https://vimeo.com/123456789)
- Direct video files: Use .mp4, .webm, or .ogg URLs

Happy blogging!

