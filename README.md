# nutPVE
internal dashboard for my homelab and proxmox cluster nutPVE. styled like a *nix terminal because.... it looks cool!


## file structure
```
www/
  index.html    main html file
  styles.css    layout, theming, etc etc css goodies
  app.js        javascript functions and behaviour
  config.json   one-stop-shop for themes, sections, services,
                hostnames etc
  upnut.py      update config.json on remote server
  also includes various .png and .svg favicons and .webmanifest
```

everything lives in `www/` and is made specifically for the ease of serving it with nginx, python, whatever.

html/css/js is my safe space. i don't like dealing with other stuff that gives me headaches.

## configure

everything you need is in `config.json`:
- `themes` contains each customizable theme for color palettes used across the site
- `sections` contains each app sections' names and id
- `ipMap` contains the information for the 'IP map' in the top right; hostnames, with their ips
- `services` has all the good stuff! each 'app' complete with names, urls, sections, descriptions, icons, and search aliases. oh, did i mention you can search?

also, there's an easily accessible settings menu on the site where you can enable/disable features:
- status lights
- live-updating time
- motd-style terminal heading
- first-boot 'start' page
- starry background

## features

- terminal-esque feel and layout
- static, easy to serve
- app status lights to quickly see problems with accessing services
- search for apps with a set list of aliases

### why?

because i enjoy html, neeeded a light-weight dashboard, and other services just don't quite have all i need or way too much.