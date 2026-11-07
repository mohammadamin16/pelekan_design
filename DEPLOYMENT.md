# Deployment

The project can be deployed to GitHub Pages without Netlify. The workflow in
`.github/workflows/deploy-pages.yml` builds `dist` with Node 22 and publishes it
automatically whenever `main` changes.

## One-time GitHub setup

In the repository settings, open **Pages**, set **Source** to **GitHub Actions**,
and save. The published site will be:

`https://mohammadamin16.github.io/pelekan_design/`

## Deploy from the project

```sh
npm ci
npm run build
git add .github/workflows/deploy-pages.yml DEPLOYMENT.md
git commit -m "Add GitHub Pages deployment"
git push origin main
```

The push starts the **Deploy to GitHub Pages** workflow. Its status and the live
URL are available in the repository's **Actions** tab.

For a local production preview:

```sh
npm run build
npm run preview
```
