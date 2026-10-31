# bm-photography

Static portfolio site (single `index.html` plus `media/seq`). Turkish by default, English with `?lang=en`.

- Open `index.html` in a browser. Keep the `media` folder next to it.
- `src/` holds the generator: run `node src/gen.cjs` to rebuild `index.html`.
- Photographs are loaded from the photographer's Pexels library; the opening sequence in `media/seq` is generated imagery.

## Branches and publishing

- `main` is the template: the site as it was designed and handed over. Design, animation, SEO and code changes by the developer start here.
- `live` is the site visitors see. Cloudflare builds and publishes this branch (`node src/gen.cjs`, then deploy), and the admin panel at `/admin/` writes to it (photos, texts, contact details). The site owner's edits exist on `live` only.
- The content files `content/photos.json` and `content/site.json` belong to `live`. After the split, do not change them on `main`.
- To bring a template change to the site, merge `main` into `live` and check the result before it publishes (a push to `live` goes live within about a minute).
- The admin panel setting `backend.branch` in `admin/config.yml` is `live` on `live` and `main` on `main`; keep that difference when merging.
## Panel commit labels

- Every save in the admin panel is a commit on `live` whose message starts with a label that says what kind of change it is: `[Panel · Galeri] fotograflar güncellendi`, `[Panel · Site ayarları] metinler-ve-iletisim güncellendi`, `[Panel · Medya] … yüklendi`. The labels are set in `admin/config.yml` under `backend.commit_messages`.
