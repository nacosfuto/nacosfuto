/**
 * @file scripts/generateHackathonHtml.js
 * Transforms a base portal index.html into an authoritative hackathon.html
 * with rich Open Graph, Twitter Card, and Schema.org SEO metadata for social crawlers.
 */

export function transformToHackathonHtml(html) {
  const hackathonTitle = "The Agentic Build 2026 | NACOS FUTO Grand Hackathon";
  const hackathonDesc = "Official Hackathon organized by the Department of Computer Science & Office of the Director of ICT, NACOS FUTO. Build any product idea using AI tools and standard SDLC. Register solo or as a team for cash prizes, mentorship, and certificates.";
  const hackathonImage = "https://res.cloudinary.com/a2mmcttn/image/upload/b_rgb:041801,c_pad,w_1200,h_630/v1795114029/nacos/general/the-agentic-build-logo-dark.png";
  const hackathonUrl = "https://nacosfuto.com/hackathons/the-agentic-build";
  const hackathonKeywords = "The Agentic Build, NACOS FUTO Hackathon, FUTO Hackathon 2026, AI Hackathon Nigeria, Department of Computer Science FUTO, Office of the Director of ICT NACOS FUTO, Build with AI";

  let result = html;

  // 1. Primary Title
  result = result.replace(/<title>[\s\S]*?<\/title>/i, `<title>${hackathonTitle}</title>`);

  // 2. Meta Tags (Title, Description, Keywords)
  if (/<meta\s+name="title"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+name="title"[^>]*>/i, `<meta name="title" content="${hackathonTitle}" />`);
  } else {
    result = result.replace(/<title>/i, `<meta name="title" content="${hackathonTitle}" />\n    <title>`);
  }

  if (/<meta\s+name="description"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${hackathonDesc}" />`);
  } else {
    result = result.replace(/<\/title>/i, `</title>\n    <meta name="description" content="${hackathonDesc}" />`);
  }

  if (/<meta\s+name="keywords"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+name="keywords"[^>]*>/i, `<meta name="keywords" content="${hackathonKeywords}" />`);
  }

  // 3. Canonical Link
  if (/<link\s+rel="canonical"[^>]*>/i.test(result)) {
    result = result.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${hackathonUrl}" />`);
  } else {
    result = result.replace(/<\/head>/i, `  <link rel="canonical" href="${hackathonUrl}" />\n  </head>`);
  }

  // 4. Open Graph Tags
  if (/<meta\s+property="og:title"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${hackathonTitle}" />`);
  }
  if (/<meta\s+property="og:description"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${hackathonDesc}" />`);
  }
  if (/<meta\s+property="og:url"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${hackathonUrl}" />`);
  }
  if (/<meta\s+property="og:site_name"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+property="og:site_name"[^>]*>/i, `<meta property="og:site_name" content="NACOS FUTO - The Agentic Build" />`);
  }
  if (/<meta\s+property="og:image"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${hackathonImage}" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />`);
  }
  if (/<meta\s+property="og:image:alt"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+property="og:image:alt"[^>]*>/i, `<meta property="og:image:alt" content="The Agentic Build 2026 - NACOS FUTO Grand Hackathon" />`);
  }

  // 5. Twitter Card Tags
  if (/<meta\s+name="twitter:card"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+name="twitter:card"[^>]*>/i, `<meta name="twitter:card" content="summary_large_image" />`);
  }
  if (/<meta\s+name="twitter:title"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${hackathonTitle}" />`);
  }
  if (/<meta\s+name="twitter:description"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${hackathonDesc}" />`);
  }
  if (/<meta\s+name="twitter:url"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+name="twitter:url"[^>]*>/i, `<meta name="twitter:url" content="${hackathonUrl}" />`);
  }
  if (/<meta\s+name="twitter:image"[^>]*>/i.test(result)) {
    result = result.replace(/<meta\s+name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${hackathonImage}" />\n    <meta name="twitter:image:alt" content="The Agentic Build 2026 - NACOS FUTO Grand Hackathon" />`);
  }

  // 6. JSON-LD Structured Data
  const jsonLdEvent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "The Agentic Build 2026 | NACOS FUTO Grand Hackathon",
    "description": hackathonDesc,
    "image": [hackathonImage],
    "startDate": "2026-12-11T09:00:00+01:00",
    "endDate": "2026-12-11T23:59:59+01:00",
    "eventAttendanceMode": "https://schema.org/MixedEventAttendanceMode",
    "eventStatus": "https://schema.org/EventScheduled",
    "location": {
      "@type": "Place",
      "name": "Department of Computer Science, Federal University of Technology Owerri (FUTO)",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Owerri",
        "addressRegion": "Imo State",
        "addressCountry": "NG"
      }
    },
    "organizer": {
      "@type": "Organization",
      "name": "Office of the Director of ICT & Department of Computer Science, NACOS FUTO",
      "url": "https://nacosfuto.com"
    }
  }, null, 2);

  result = result.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script type="application/ld+json">\n${jsonLdEvent}\n    </script>`);

  // 7. Noscript Fallback
  const noscriptContent = `<noscript>
      <div style="padding: 24px; font-family: sans-serif; max-width: 600px; margin: 0 auto; text-align: center; background: #041801; color: #ffffff;">
        <h1 style="color: #4bd043;">The Agentic Build 2026 | NACOS FUTO Grand Hackathon</h1>
        <p>Official Hackathon organized by the Department of Computer Science &amp; Office of the Director of ICT, NACOS FUTO.</p>
        <p>Build any product idea using AI tools and standard SDLC. Open to solo developers and teams.</p>
        <p><a href="/hackathons/the-agentic-build/apply" style="color: #4bd043; font-weight: bold; text-decoration: underline;">Apply for The Agentic Build</a></p>
      </div>
    </noscript>`;

  result = result.replace(/<noscript>[\s\S]*?<\/noscript>/i, noscriptContent);

  return result;
}
