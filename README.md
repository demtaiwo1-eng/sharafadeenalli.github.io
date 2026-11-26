# CampTech Oyo — public information foundation

This repository contains the static public-facing foundation for CampTech Oyo.

## Current state
- Mobile-responsive static landing page.
- Clearly labels the page as a foundation preview.
- Does not invent live metrics or imply that feeds and backend services are connected.

## Publish with GitHub Pages
1. Open **Settings → Pages**.
2. Select **Deploy from a branch**.
3. Choose **main** and **/(root)**, then save.
4. Wait for the Pages deployment workflow to complete.

## Production architecture for high traffic
GitHub Pages is suitable for the static frontend, but should not be treated as the complete platform backend. For high concurrency:
- Put a global CDN, DNS, WAF and DDoS protection in front of public assets and APIs.
- Keep public pages cacheable and serve images/files from object storage and CDN.
- Run stateless APIs on autoscaling compute behind a load balancer.
- Use managed PostgreSQL with connection pooling, read replicas, backups and point-in-time recovery.
- Put collection, indexing, notifications and report generation on queues and worker services.
- Add rate limits, observability, health checks, load tests and multi-zone recovery.

One million registered/monthly users is not the same as one million simultaneous active users. Capacity must be sized and verified against measured requests per second, payload sizes, geographic distribution, cache hit rate and read/write mix.

## Data and safety principles
- Collect only publicly accessible content in accordance with platform terms and applicable law.
- Store source URL, publisher, publication time, collection time and review status.
- Distinguish reported claims, allegations and independently verified facts.
- Do not scrape private accounts, bypass access controls or build individual political-opinion profiles or targeted political persuasion.
- Keep secrets out of this repository; use deployment secret stores.
