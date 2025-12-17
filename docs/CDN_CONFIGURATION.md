# CDN Configuration Guide

Complete guide to setting up Content Delivery Network for optimal performance and scaling.

---

## Overview

A CDN improves performance by:
- Caching static assets globally
- Reducing server load
- Improving load times for users worldwide
- Providing DDoS protection
- Enabling HTTPS

---

## Recommended CDN Providers

### 1. Cloudflare (Recommended)

**Why Cloudflare:**
- Free tier available
- Global network (200+ locations)
- Automatic HTTPS
- DDoS protection
- Edge caching
- Image optimization
- Analytics

**Setup Time:** 15-30 minutes

### 2. Fastly

**Benefits:**
- Real-time purging
- Advanced VCL configuration
- Excellent performance
- Instant cache invalidation

**Cost:** Starts at $50/month

### 3. AWS CloudFront

**Benefits:**
- Deep AWS integration
- Pay-as-you-go pricing
- Lambda@Edge for serverless
- Global coverage

**Cost:** Based on usage

---

## Cloudflare Setup (Recommended)

### Step 1: Create Account

1. Go to https://www.cloudflare.com
2. Sign up for free account
3. Verify email

### Step 2: Add Your Domain

1. Click "Add a Site"
2. Enter your domain name
3. Select Free plan (or higher)
4. Click "Add site"

### Step 3: DNS Configuration

Cloudflare will scan your existing DNS records.

**Required DNS Records:**
```
Type  Name              Value
A     @                 your-server-ip
A     www               your-server-ip
CNAME api               your-api-domain
CNAME assets            your-assets-domain
```

**Supabase Integration:**
```
CNAME supabase          your-project.supabase.co
CNAME functions         your-project.supabase.co/functions
```

### Step 4: Update Nameservers

1. Copy Cloudflare nameservers (e.g., `drew.ns.cloudflare.com`)
2. Go to your domain registrar
3. Update nameservers
4. Wait 24-48 hours for propagation

### Step 5: SSL/TLS Configuration

1. Go to SSL/TLS tab
2. Select "Full (strict)"
3. Enable "Always Use HTTPS"
4. Enable "Automatic HTTPS Rewrites"

### Step 6: Caching Rules

**Page Rules (Free plan allows 3):**

**Rule 1: Cache Static Assets**
```
URL: *dollarsmiley.com/assets/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 month
```

**Rule 2: Bypass API**
```
URL: *dollarsmiley.com/api/*
Settings:
  - Cache Level: Bypass
```

**Rule 3: Cache Images**
```
URL: *dollarsmiley.com/*.{jpg,jpeg,png,gif,webp}
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 week
```

### Step 7: Performance Settings

**Auto Minify:**
- ✅ JavaScript
- ✅ CSS
- ✅ HTML

**Brotli Compression:**
- ✅ Enable

**HTTP/2:**
- ✅ Enable

**HTTP/3 (QUIC):**
- ✅ Enable

### Step 8: Image Optimization

**Polish (Pro plan+):**
- Lossy compression
- WebP conversion
- Automatic resizing

**Free Alternative:**
Use Supabase image transformations or external service like Cloudinary.

---

## Expo Web + CDN Configuration

### expo.web.app.json

```json
{
  "expo": {
    "assetBundlePatterns": [
      "assets/**/*"
    ],
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    }
  }
}
```

### Build for Production

```bash
# Build web app
expo export --platform web

# Output directory: dist/
```

### Deploy Static Assets

**Option 1: Cloudflare Pages**
```bash
npx wrangler pages publish dist
```

**Option 2: Netlify**
```bash
netlify deploy --prod --dir=dist
```

**Option 3: Vercel**
```bash
vercel --prod
```

---

## Asset Optimization

### Image Optimization

**Best Practices:**
- Use WebP format
- Compress images (TinyPNG, ImageOptim)
- Generate multiple sizes (responsive)
- Lazy load images
- Use CDN URLs

**Expo Image Caching:**
```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: 'https://cdn.example.com/image.jpg' }}
  cachePolicy="memory-disk"
  contentFit="cover"
  transition={200}
/>
```

### Font Optimization

**Load fonts efficiently:**
```typescript
import { useFonts } from 'expo-font';

const [fontsLoaded] = useFonts({
  'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
});
```

**CDN-hosted fonts:**
```typescript
// Use CDN for production
const fontUrl = 'https://cdn.example.com/fonts/Inter-Regular.ttf';
```

---

## Supabase + CDN Integration

### Storage Configuration

**Supabase Storage URLs:**
```
https://your-project.supabase.co/storage/v1/object/public/bucket/file.jpg
```

**CDN Wrapper:**
```typescript
export function getCDNUrl(supabaseUrl: string): string {
  // Proxy through CDN
  return supabaseUrl.replace(
    'your-project.supabase.co',
    'cdn.dollarsmiley.com'
  );
}
```

**Cloudflare Worker (Optional):**
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Rewrite to Supabase
  url.hostname = 'your-project.supabase.co'

  // Add cache headers
  const response = await fetch(url, request)
  const newResponse = new Response(response.body, response)
  newResponse.headers.set('Cache-Control', 'public, max-age=31536000')

  return newResponse
}
```

---

## Cache Invalidation

### Cloudflare API

```bash
# Purge everything
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Purge specific files
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://example.com/image.jpg"]}'
```

### Programmatic Invalidation

```typescript
export async function purgeCDNCache(urls: string[]): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to purge CDN cache');
  }
}
```

---

## Monitoring & Analytics

### Cloudflare Analytics

**Available Metrics:**
- Requests per second
- Bandwidth usage
- Cache hit ratio
- Response time
- Geographic distribution
- Top countries
- Top paths

**Access:**
1. Go to Analytics tab
2. View real-time data
3. Export reports

### Custom Analytics

```typescript
// Track CDN performance
export function trackCDNHit(url: string, cached: boolean): void {
  // Log to analytics service
  analytics.track('cdn_hit', {
    url,
    cached,
    timestamp: Date.now(),
  });
}
```

---

## Performance Optimization

### Cache Headers

**Static Assets:**
```
Cache-Control: public, max-age=31536000, immutable
```

**API Responses:**
```
Cache-Control: public, max-age=300, s-maxage=600
```

**Dynamic Content:**
```
Cache-Control: public, max-age=0, must-revalidate
```

### Versioned Assets

**File Naming:**
```
app.js → app.v1.2.3.js
style.css → style.abc123.css
```

**Expo Metro Bundler:**
Automatically adds content hashes to filenames.

---

## Security

### HTTPS Enforcement

**Cloudflare Settings:**
- Always Use HTTPS: ✅
- Automatic HTTPS Rewrites: ✅
- Minimum TLS Version: 1.2
- TLS 1.3: ✅

### DDoS Protection

**Cloudflare Features:**
- Automatic DDoS mitigation
- Rate limiting (paid plans)
- Bot protection
- Web Application Firewall (WAF)

### Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Cost Optimization

### Free Tier Limits (Cloudflare)

**Included:**
- Unlimited bandwidth
- Unlimited requests
- 3 page rules
- Universal SSL
- DDoS protection
- CDN caching
- Analytics

**Limitations:**
- No image optimization
- Basic analytics
- Limited WAF rules

### Bandwidth Usage

**Typical Usage:**
- Static assets: 80% cacheable
- API calls: 20% bypass cache
- Images: 90% cacheable

**Estimate:**
```
1000 daily users
10 MB per user session
= 10 GB daily bandwidth
= 300 GB monthly

Cloudflare Free Tier: Unlimited ✅
```

---

## Troubleshooting

### High Cache Miss Rate

**Causes:**
- Incorrect cache headers
- Dynamic URLs (query params)
- No-cache directives
- Short TTL

**Solutions:**
- Add cache headers
- Normalize URLs
- Remove unnecessary query params
- Increase TTL

### Stale Content

**Solutions:**
- Purge cache via API
- Use versioned URLs
- Reduce TTL for frequently updated content

### SSL Errors

**Solutions:**
- Verify SSL mode (Full Strict)
- Check origin certificate
- Enable "Always Use HTTPS"
- Clear browser cache

---

## Production Checklist

### Pre-Launch

- [ ] Domain added to CDN
- [ ] DNS records configured
- [ ] SSL certificate active
- [ ] Cache rules configured
- [ ] Performance settings enabled
- [ ] Security headers set
- [ ] Image optimization enabled
- [ ] Analytics tracking
- [ ] Purge API configured

### Post-Launch

- [ ] Monitor cache hit ratio
- [ ] Check response times
- [ ] Review bandwidth usage
- [ ] Test from multiple locations
- [ ] Verify SSL grade (A+)
- [ ] Check mobile performance
- [ ] Monitor error rates
- [ ] Review security logs

---

## Testing

### Cache Verification

```bash
# Check cache status
curl -I https://dollarsmiley.com/assets/logo.png

# Look for headers:
# cf-cache-status: HIT (cached)
# cf-cache-status: MISS (not cached)
# cf-cache-status: BYPASS (not cacheable)
```

### Performance Testing

**Tools:**
- GTmetrix: https://gtmetrix.com
- WebPageTest: https://www.webpagetest.org
- Lighthouse: Chrome DevTools
- Pingdom: https://tools.pingdom.com

**Metrics to Track:**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)

---

## Advanced Configuration

### Multi-CDN Strategy

**Primary:** Cloudflare
**Failover:** Fastly or CloudFront
**Implementation:** DNS-based failover

### Edge Computing

**Cloudflare Workers:**
```javascript
// Geolocation-based routing
addEventListener('fetch', event => {
  const country = event.request.cf.country

  // Route to nearest server
  const server = getServerForCountry(country)

  event.respondWith(fetch(server + event.request.url))
})
```

### Image Resizing

**Cloudflare Image Resizing:**
```
https://dollarsmiley.com/cdn-cgi/image/width=800,quality=85/image.jpg
```

---

## Support Resources

**Cloudflare:**
- Docs: https://developers.cloudflare.com
- Community: https://community.cloudflare.com
- Support: support@cloudflare.com

**Fastly:**
- Docs: https://docs.fastly.com
- Support: support@fastly.com

**AWS CloudFront:**
- Docs: https://docs.aws.amazon.com/cloudfront
- Support: AWS Support Console

---

**Last Updated:** 2024-11-09
**Version:** 1.0.0
