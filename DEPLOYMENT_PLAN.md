## Deployment Checklist for docs.locki.io

| Step | Status | Action |
|------|:------:|--------|
| 1. CNAME file | ✅ | `static/CNAME` created with `docs.locki.io` |
| 2. GitHub Actions | ✅ | `.github/workflows/deploy.yml` ready |
| 3. Push to GitHub | ⬜ | `git add . && git commit && git push` |
| 4. DNS CNAME record | ⬜ | Add `docs` → `locki-io.github.io` in your DNS provider |
| 5. Enable Pages | ⬜ | Repo Settings → Pages → Source: GitHub Actions |
| 6. Wait for SSL | ⬜ | GitHub auto-provisions HTTPS (5-10 min) |

### DNS Configuration (do this in your DNS provider)

```
Type: CNAME
Name: docs
Value: locki-io.github.io
TTL: Auto
```

**Your existing `locki.io` site will NOT be affected** — this creates a separate subdomain.

---

### 1. **Quickest / Classic method** (using `docusaurus deploy`)

This is what the official docs recommend for simple setups.

the deployment should be done on docs.locki.io beware that another repo is doing it on locki.io (vite = front page)

- In your `docusaurus.config.js`, set:
  ```js
  url: 'https://<username>.github.io',          // or 'https://<username>.github.io/<repo-name>' if project site
  baseUrl: '/',                                 // '/' for user/organization site (username.github.io), or '/repo-name/' for project site
  organizationName: 'locki-io',
  projectName: 'docs.locki.io',
  trailingSlash: false,
  ```
- Then run (from your project root):

  ```
  GIT_USER=<your-github-username> yarn deploy
  ```

  (or `npm run deploy` if you use npm)

  → This command builds the site and pushes the output to the `gh-pages` branch automatically.

- Go to your repo → Settings → Pages → set source to **Deploy from a branch** → select `gh-pages` branch → `/ (root)`.

Your site will be live at:

- `https://<username>.github.io` (if repo = `<username>.github.io`)
- or `https://<username>.github.io/<repo-name>/` (project site)

### 2. **Modern / Recommended method** (using GitHub Actions – cleaner repo)

Many people (and newer examples) prefer this because your main branch stays clean (no built files).

- Use GitHub Actions workflow (you can copy a template from examples like peaceiris/actions-gh-pages or the official Docusaurus one).
- Example basic workflow (`.github/workflows/deploy.yml`):

  ```yaml
  name: Deploy to GitHub Pages

  on:
    push:
      branches: [main]

  permissions:
    contents: write

  jobs:
    build-and-deploy:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: yarn

        - run: yarn install --frozen-lockfile
        - run: yarn build

        - name: Deploy
          uses: peaceiris/actions-gh-pages@v4
          with:
            github_token: ${{ secrets.GITHUB_TOKEN }}
            publish_dir: ./build
  ```

- In repo Settings → Pages → choose **GitHub Actions** as source.

This builds & deploys automatically on every push to main.

Yes, you can host both your existing Vite app (at `https://locki-io.github.io`, the root/user site) **and** a separate Docusaurus documentation site **on the same GitHub account**, using a subdomain like `docs.locki.io` — but **not** from the same repository in a clean way.

GitHub Pages has strict rules:

- One **user/organization site** per account → that's your current Vite deployment at `locki-io.github.io` (from the repo named `locki-io/locki-io.github.io`).
- One **project site** per repository → at `https://locki-io.github.io/<repo-name>/` (or on a custom domain/subdomain).

You **cannot** natively serve two completely separate sites (root + subdomain) from **one repo** with GitHub Pages alone — each Pages site ties to one repo (and one custom domain/subdomain per repo).

### Recommended & Cleanest Solution: Separate Repo for Docusaurus

This is what most projects do (including many large open-source ones).

1. **Create a new repository** just for the docs:

   - Name it something like `locki-docs`, `docs`, or `locki.io-docs`.
   - Initialize it with your Docusaurus project (`npx create-docusaurus@latest my-docs classic` then push).

2. **Configure Docusaurus for the subdomain**:
   In `docusaurus.config.js`:

   ```js
   export default {
     url: "https://docs.locki.io", // full URL with subdomain
     baseUrl: "/", // root of the domain
     organizationName: "locki-io",
     projectName: "locki-docs", // or whatever your repo name is
     trailingSlash: false, // or true — test what works best
     // ... other settings
   };
   ```

3. **Add CNAME file for the subdomain**:

   - In your Docusaurus project, create `static/CNAME` (no extension) with exactly one line:
     ```
     docs.locki.io
     ```
   - This file gets copied to the build root during `yarn build` / deploy.

4. **Deploy to GitHub Pages** (two good options):

   - **Option A: Classic `docusaurus deploy`** (simple for manual deploys)

     ```
     GIT_USER=JnXmas yarn deploy
     ```

     (It pushes build/ to the `gh-pages` branch of your docs repo.)

   - **Option B: GitHub Actions** (automatic on push to main — recommended)
     Add `.github/workflows/deploy.yml` in the docs repo:

     ```yaml
     name: Deploy Docusaurus to GitHub Pages

     on:
       push:
         branches: [main]

     permissions:
       contents: write

     jobs:
       build-and-deploy:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v4
           - uses: actions/setup-node@v4
             with:
               node-version: 20
               cache: "yarn"
           - run: yarn install --frozen-lockfile
           - run: yarn build
           - name: Deploy
             uses: peaceiris/actions-gh-pages@v4
             with:
               github_token: ${{ secrets.GITHUB_TOKEN }}
               publish_dir: ./build
     ```

5. **Set up DNS for `docs.locki.io`** (this is the key part for the subdomain):

   - Go to your DNS provider (where `locki.io` is managed, e.g. Cloudflare, Namecheap, OVH, etc.).
   - Add a **CNAME** record:
     - Name / Host: `docs`
     - Value / Target: `locki-io.github.io` (note: **without** trailing dot or path — exactly like this)
     - TTL: auto or 1 hour
   - Save and wait 5–60 minutes (DNS propagation).

6. **Enable Pages in the new repo**:
   - Go to repo → Settings → Pages
   - Source: Deploy from a branch → `gh-pages` → `/ (root)`
   - (GitHub will auto-detect the CNAME file and show `docs.locki.io` as custom domain — it may take a few minutes to verify.)

Once done:

- Vite app → https://locki.io (or locki-io.github.io)
- Docs → https://docs.locki.io

### Alternatives If You Really Want One Repo (Not Recommended)

- Serve docs at a subpath like `https://locki.io/docs/`:

  - Build Docusaurus with `baseUrl: '/docs/'`
  - Copy the `/build` folder into your Vite project's `/public/docs` or similar.
  - But this mixes two build systems — messy for CI, versions, etc.

- Use a reverse proxy / different host (Cloudflare Pages, Netlify, Vercel) for docs — point `docs.locki.io` there instead.

The separate-repo approach is free, reliable, standard, and keeps your Vite app untouched. If you run into any specific error during setup (DNS, 404s, etc.), share details and I can help troubleshoot! 🚀

### Common gotchas to watch for

- Wrong `baseUrl` → site loads but assets 404 (most frequent issue)
- For project sites (not username.github.io repo) → `baseUrl: '/repo-name/'`
- Use **personal access token** if CLI auth fails (GitHub dropped password auth years ago)
- Enable GitHub Pages in repo settings after first deploy

Official guide (still the best source): https://docusaurus.io/docs/deployment#deploying-to-github-pages
