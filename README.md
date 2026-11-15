# hugo-theme-98

A retro desktop theme for [Hugo](https://gohugo.io/) in the style of Windows 2000, built on
[98.css](https://github.com/jdan/98.css) by Jordan Scales. A classic Windows 98 style is included too.

- Every page opens in a window. You can drag it by the title bar, resize it from the edges, and
  minimize it to the taskbar, maximize it or close it.
- Sections open as Explorer windows with a details-view file list.
- The desktop icons and Start menu are built from your site menu. The taskbar shows a button per
  window and a clock.
- Pages can have a contents pane, tags, previous/next links and a status bar.
- The 404 page is an error dialog.
- Shortcodes: `window`, `dialog`, `fieldset`, `button`, `youtube`.
- It works without JavaScript; the scripts only add the window behaviour, taskbar and clock.
- On phones the windows stack full-width and the desktop icons move into a row along the top.

## Install

Tested with Hugo 0.170 (the standard edition is enough).

```bash
hugo new site mysite
```

```bash
cd mysite
git clone https://github.com/trustnotwo/hugo-theme-98 themes/hugo-theme-98
```

Then set `theme = "hugo-theme-98"` in `hugo.toml`. [`exampleSite/hugo.toml`](exampleSite/hugo.toml)
is a complete starting config. To preview the example site, run this from the `exampleSite` folder:

```bash
hugo server
```

## Basic configuration

Everything below goes in your site's `hugo.toml`.

### Title and description

```toml
title = "My Site"

[params]
  description = "One line about the site."   # meta description
  welcomeTitle = "Welcome to My Site"        # title bar of the home window
```

The home window shows `content/_index.md`. Start it with a `# Heading` line for the big heading.

### Background

The desktop is the stock Windows 2000 blue (`#3a6ea5`). To change it:

```toml
[params]
  desktopColor = "#008080"              # any CSS colour (this one is the Windows 98 teal)
  wallpaper = "/images/wallpaper.jpg"   # optional image, from static/images/
```

A wallpaper covers the screen on top of the colour. The icon labels get a drop shadow so they stay
readable over a photo.

### Desktop icons and Start menu

Both come from the `main` menu. `params.icon` picks the icon:

```toml
[[menus.main]]
  name = "Posts"
  pageRef = "/posts"
  weight = 2
  [menus.main.params]
    icon = "folder"
```

Built-in icons are `computer`, `folder`, `folder-open`, `document`, `internet-document`, `info`,
`warning`, `error` and `start`.

### Home page and sections

```toml
[params]
  mainSections = ["posts"]   # sections listed under "Recent Documents" on the home page
  recentCount = 8            # how many recent pages it shows
```

### Style

```toml
[params]
  style = "98"    # the classic Windows 98 look; the default is "2000"
```

### Your own icons

To use your own PNG icons, set `iconFormat = "png"` and put a 16×16 and a 32×32 file for each name in
your site's `static/icons/`, for example `folder-16.png` and `folder-32.png`. Only publish icons you're
allowed to share: original Windows icons are Microsoft artwork.

## All parameters

| Param | Default | What it does |
|---|---|---|
| `style` | `2000` | `2000` or `98` |
| `desktopColor` | `#3a6ea5` (98: `#008080`) | Desktop background colour |
| `wallpaper` | none | Background image URL |
| `welcomeTitle` | `Welcome to <title>` | Home window title bar |
| `welcomeHeading` | none | Home heading from the config instead of the markdown |
| `description` | none | Meta description; shown on the home page if `content/_index.md` is empty |
| `mainSections` | auto | Sections in "Recent Documents" |
| `recentCount` | `8` | Number of recent pages on the home page |
| `dateFormat` | `1/2/2006` | Go date layout |
| `documentApp` | `Notepad` | Title-bar suffix on pages (`Title - Notepad`); per page with `app:` |
| `readableProse` | `false` | Slightly larger article text |
| `iconFormat` | `svg` | `png` = your own icons from `static/icons/` |
| `startLabel` / `startBanner` | `Start` / site title | Start button label and the Start menu's side banner |
| `trayText` | none | Text next to the clock |
| `favicon` | computer icon | Favicon path |
| `css98` | unpkg CDN | URL of 98.css, to self-host it |

Page front matter: `toc: true` (contents pane), `showDate: false`, `app`, `filetype` (the Type
column in file lists), `author`.

## Shortcodes

```text
{{< window title="readme.txt" icon="document" status="Ready" >}}
Any **Markdown**.
{{< /window >}}

{{< dialog type="warning" title="Heads up" button="OK" >}}
Message text.
{{< /dialog >}}

{{< fieldset legend="Options" >}}
Grouped content.
{{< /fieldset >}}

{{< button href="/posts/" >}}Open Posts{{< /button >}}

{{< youtube VIDEO_ID >}}
{{< youtube id="VIDEO_ID" title="Describe the video" start="90" align="center" >}}
```

`youtube` replaces Hugo's built-in one. The player is at most 720px wide, sits on the left unless
`align="center"` or `align="right"`, and uses YouTube's privacy-enhanced `youtube-nocookie.com` player.

## Customising further

- **Colours:** the palette is CSS variables at the top of `assets/css/theme.css`, and
  `assets/css/skins/2000.css` overrides them for the 2000 style. For your own skin, add
  `assets/css/skins/<name>.css` to your site with a `:root { ... }` block and set `style = "<name>"`.
- **Extra head tags** (analytics, fonts): override the empty `layouts/partials/head-extra.html`.
- **Self-hosting 98.css:** copy `98.css` and its `ms_sans_serif*.woff`/`.woff2` fonts from the npm
  package's `dist/` folder into `static/css/`, then set `css98 = "/css/98.css"`.

## License

MIT. 98.css is © Jordan Scales, also MIT, and is loaded from its CDN rather than bundled.
