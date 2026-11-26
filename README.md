# CampTech Oyo — public website

Mobile-first public information and operations interface for the CampTech Oyo project.

## Published interface
- Overview and module navigation.
- Public updates list and client-side search.
- Media monitor that queries the connected API's public-source index.
- Public project listing.
- Field report draft form. Until a secure server submission service is configured, drafts are stored only in the current browser/device and are not submitted to the team.

## Configure the API
Edit `config.js` and set:
```js
window.CAMPTECH_CONFIG = { API_BASE_URL: "https://YOUR-API-HOST" };
```
Use the API origin only, without a trailing path. The API host must allow this website's origin in its `CORS_ORIGIN` environment variable.

## GitHub Pages
A workflow at `.github/workflows/pages.yml` deploys the root directory when commits reach `main`. In repository **Settings → Pages**, select **GitHub Actions** as the build/deployment source if GitHub requests a Pages source selection. Check the Actions tab for the deployment result.

The expected project-site URL is normally `https://demtaiwo1-eng.github.io/sharafadeenalli.github.io/` unless a custom domain or account-level Pages configuration changes it. The repository URL itself is not the live website URL.

## Production and scale
GitHub Pages/CDN can serve the static interface, but the API/database are separate services. For high concurrency, use edge caching, WAF/DDoS protection, stateless autoscaling API instances, pooled managed PostgreSQL, queues for ingestion and report generation, monitoring and load tests. One million concurrent users is a measured capacity target, not something GitHub Pages alone guarantees.

Do not publish secrets in `config.js` or any frontend file. Browser code is public.
