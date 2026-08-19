# nutpve

Homelab dashboard for internal use. A terminal-styled web page listing self-hosted services with live status checks, a command-line app launcher, and per-app IP map.

## Structure

```
www/
  index.html     page structure
  styles.css     layout and theming
  app.js         all behavior
  config.json    themes, sections, services, ip map
  favicon.svg    tab icon
  robots.txt     crawl disallow
```

All dashboard files live in `www/`; serve that directory as the web root.

## Run

Any static file server works — there is no build step.

```bash
cd www && python3 -m http.server 8080
```

or with nginx:

```nginx
server {
  listen 80;
  server_name nutpve.local;
  root /path/to/www;
}
```

Open `http://localhost:8080`.

## Configure

Everything is driven by `config.json`:

- `themes` — theme objects keyed by name; each has a `label`, a `colors` map of CSS-variable tokens (`white`, `background`, `grey`, `green`, `red`, `logo`, plus optional semantic tokens like `--outside`, `--border`, `--surface`), and optional raw `css` for per-theme effects.
- `sections` — numbered section list; `id` is the numeric reference used by services.
- `ipMap` — hostname → IP pairs shown in the IPs menu; clicking an IP copies it.
- `services` — apps with `name`, `url` (checked for status), optional `copyUrl`, `description`, `icon`, `section` (must match a section `id`), and optional `aliases` for the command line.

Add or remove themes and services by editing `config.json` and reloading.

## Version

The version lives in `app.js` (`VERSION`, e.g. `"0.14.2"`). The build number is derived from it: the version string base64-encoded, stripped of non-alphanumeric characters, truncated to 8 characters. Bump `VERSION` for each release; also bump the `?v=` query strings on the `styles.css` and `app.js` links in `index.html` so browsers pick up new assets.
