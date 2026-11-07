# Deployment

The project has a no-login static fallback using `raw.githack.com`. It serves
the committed production build directly from GitHub, so it does not require a
Netlify, GitHub Pages, or other hosting account.

## No-login deployment

Build and publish the generated files to `main`:

```sh
npm ci
npm run build
git add -f dist
git commit -m "Publish static build"
git push origin main
```

The site is then available at:

`https://raw.githack.com/mohammadamin16/pelekan_design/main/dist/index.html`

The repository also contains a GitHub Pages workflow for accounts that later
enable Pages. It is optional and is not needed for the no-login URL above.

For a local production preview:

```sh
npm run build
npm run preview
```
