# hugo2k-theme

A retro desktop theme for [Hugo](https://gohugo.io/) in the style of Windows 2000, built on
[98.css](https://github.com/jdan/98.css) by Jordan Scales. Visitors can switch it to Windows 98, a dark
Windows 2000, or the Windows XP Zune and Royale Noir looks.

- Every page opens in a window. You can drag it by the title bar, resize it from the edges, and
  minimize it to the taskbar, maximize it or close it.
- Sections open as Explorer windows with a details-view file list.
- The desktop icons and Start menu are built from your site menu. The taskbar shows a button per
  window and a clock.
- Built-in programs in the Start menu: **Search** (searches every page), **Command Prompt** (a DOS-style
  shell for getting around the site) and **Settings** (Display Properties: look, wallpaper, colours, font size).
- Right-click the desktop for Arrange Icons, Refresh and Properties.
- Optional dark mode for visitors whose system is set to dark.
- Pages can have a contents pane, tags, previous/next links and a status bar.
- The 404 page is an error dialog.
- Shortcodes: `window`, `dialog`, `fieldset`, `button`, `youtube`.
- It works without JavaScript; the scripts only add the window behaviour, the programs, the taskbar and clock.
- On phones the windows stack full-width and the desktop icons move into a row along the top.

## Install

Tested with Hugo 0.170 (the standard edition is enough).

```bash
hugo new site mysite
```

```bash
cd mysite
git clone https://github.com/trustnotwo/hugo2k-theme themes/hugo2k-theme
```

Then set `theme = "hugo2k-theme"` in `hugo.toml`. [`exampleSite/hugo.toml`](exampleSite/hugo.toml)
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
  wallpaperName = "Beach"               # its name in Display Properties (default: the file name)
  wallpaperPosition = "tile"            # stretch (default), center or tile
```

A wallpaper covers the screen on top of the colour. The icon labels get a drop shadow so they stay
readable over a photo.

Visitors can pick another background in **Start > Settings > Background**: your wallpaper, the theme's
seamless tiles, a picture from their own computer, or none, shown stretched, centred or tiled, plus a
desktop colour. Their choice is saved in their browser only.

To offer more pictures, list them all (this replaces `wallpaper` in the list):

```toml
[[params.wallpapers]]
  name = "Beach"
  url = "/images/beach.jpg"

[[params.wallpapers]]
  name = "Bricks"
  url = "/images/bricks.png"
  tile = true        # a seamless tile: picking it switches Picture Display to Tile
  size = 256         # the tile's width in pixels, for the preview
```

The theme's own tiles (from `data/wallpapers.yaml`) are listed after yours; set `themeWallpapers = false`
to hide them.

### Looks and dark mode

`style` picks the look every visitor starts with. Visitors can change it in
**Start > Settings > Appearance**.

| `style` | Look |
|---|---|
| `2000` (default) | Windows 2000 |
| `dark` | Windows 2000 with dark windows (a low-glare scheme, not a real Windows one) |
| `98` | Windows 98 (no Explorer side panel) |
| `zune` | Windows XP Zune: black chrome with orange accents |
| `royale-noir` | Windows XP Royale Noir: blue-black chrome |
| `zune-dark`, `royale-noir-dark` | The XP looks with dark window insides |

The XP looks use their own window, taskbar and Start menu images and switch the icons to an XP icon set.

To give visitors whose system is set to dark mode a dark look automatically (until they pick one):

```toml
[params]
  autoDark = true
  darkStyle = "royale-noir-dark"                                 # default "dark"
  darkWallpaper = "/wallpapers/propaganda/flooded-motel-4.jpg"   # optional
  darkWallpaperPosition = "tile"                                 # stretch (default), center or tile
```

Code blocks follow the look (light or dark) when Hugo writes highlighting as classes:

```toml
[markup.highlight]
  noClasses = false
```

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

A menu entry for a section with no published pages stays hidden until the section has one
(`hideEmptySections = false` always shows it).

Built-in icons (from the [SE98](#icons-images-and-licensing) set): `computer`, `my-documents`, `folder`,
`folder-open`, `document`, `notepad`, `internet`, `internet-document`, `network`, `recycle-bin`,
`programs`, `settings`, `search`, `run`, `help`, `shut-down`, `start`, `favorites`, `image`, `zip`,
`info`, `warning`, `error` and `command-prompt`.

### Home page and sections

```toml
[params]
  mainSections = ["posts"]   # sections listed under "Recent Documents" on the home page
  recentCount = 8            # how many recent pages it shows
```

### Your own icons

Each icon is a 16×16 and a 32×32 PNG named `<name>-16.png` and `<name>-32.png`. To replace one, or add a
new name for a menu entry, put files with that name in your site's `static/icons/`. Your site's files
win over the theme's. To use SVGs instead, set `iconFormat = "svg"` and supply `static/icons/<name>.svg`.
The XP looks use `static/skins/xp-icons/` for the names it has and fall back to `static/icons/` for the rest.

## The built-in programs

All three open from the Start menu (and the desktop's right-click menu) as normal windows.

- **Search** looks through every page's title, tags and text. Hugo builds a small JSON index of your
  published pages with the site, so no server is needed. Drafts are never included.
- **Command Prompt** starts in the folder of the page you're on. `dir`, `cd`, `tree` and `type` work on
  your sections and pages (`type` shows a page's Markdown), typing a file name opens it, and `find`,
  `search`, `color`, `title`, `cls`, `ver` and `exit` work too. Up/Down recall commands; Tab completes names.
- **Display Properties** has Background (wallpaper, position, colour, Browse... for a visitor's own
  picture), Appearance (look and font size, with a preview) and Effects (window animations, large icons).

## All parameters

| Param | Default | What it does |
|---|---|---|
| `style` | `2000` | Starting look (see [Looks and dark mode](#looks-and-dark-mode)) |
| `autoDark` | `false` | Use `darkStyle` for visitors whose system is in dark mode |
| `darkStyle` | `dark` | The look `autoDark` uses |
| `darkWallpaper` / `darkWallpaperPosition` | none | Wallpaper (and stretch/center/tile) `autoDark` uses |
| `desktopColor` | `#3a6ea5` (98: `#008080`) | Desktop background colour |
| `wallpaper` / `wallpaperName` | none | Background image URL and its name in Display Properties |
| `wallpaperPosition` | stretch | How `wallpaper` is shown: `stretch`, `center` or `tile` |
| `wallpapers` | none | List of `{name, url, tile, size}` offered in Display Properties |
| `themeWallpapers` | `true` | Offer the theme's tiles in Display Properties |
| `welcomeTitle` | `Welcome to <title>` | Home window title bar |
| `welcomeHeading` | none | Home heading from the config instead of the markdown |
| `description` | none | Meta description; shown on the home page if `content/_index.md` is empty |
| `mainSections` | auto | Sections in "Recent Documents" |
| `recentCount` | `8` | Number of recent pages on the home page |
| `hideEmptySections` | `true` | Hide menu entries for sections with no pages |
| `dateFormat` | `1/2/2006` | Go date layout |
| `documentApp` | `Notepad` | Title-bar suffix on pages (`Title - Notepad`); per page with `app:` |
| `readableProse` | `false` | Slightly larger article text |
| `iconFormat` | `png` | `svg` = your own SVG icons from `static/icons/` |
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

- **Colours:** the palette is CSS variables at the top of `assets/css/theme.css`. Each look layers files
  from `assets/css/` on top (listed in `data/themes.yaml`): `classic.css` re-skins 98.css, and
  `skins/*.css` set each look's colours.
- **Your own look:** add `assets/css/skins/<name>.css` to your site with a `:root { ... }` block and set
  `style = "<name>"`; it's built on the classic look. To list it in Display Properties too, copy the theme's
  `data/themes.yaml` into your site's `data/` and add an entry.
- **Extra head tags** (analytics, fonts): override the empty `layouts/partials/head-extra.html`.
- **Self-hosting 98.css:** copy `98.css` and its `ms_sans_serif*.woff`/`.woff2` fonts from the npm
  package's `dist/` folder into `static/css/`, then set `css98 = "/css/98.css"`.

## Icons, images and licensing

The theme's code is MIT (see [`LICENSE`](LICENSE)). The images it bundles come from other projects and
keep their own licences; each folder has the licence text. If you redistribute them, their licence applies.

| Folder | What | From | Licence |
|---|---|---|---|
| `static/icons/` | Default icons | **SE98** by nestoris ([github.com/nestoris/Win98SE](https://github.com/nestoris/Win98SE)), based on [Chicago95](https://github.com/grassmunk/Chicago95) | GPL-2.0 |
| `static/icons/command-prompt-*.png` | Command Prompt icon | Drawn for this theme | MIT |
| `static/skins/zune/`, `static/skins/royale-noir/` | XP window, taskbar, Start menu and button images | **Windows XP Zune** and **Windows XP Royale Dark** by the [B00merang Project](https://github.com/B00merang-Project/windows-xp) | GPL-3.0 |
| `static/skins/xp-icons/` | Icons for the XP looks | **Windows XP** icon theme by [B00merang Artwork](https://github.com/B00merang-Artwork/Windows-XP) | GPL-2.0 |
| `static/wallpapers/propaganda/` | Seamless tile wallpapers | **Propaganda** by Bowie J. Poag (via [BenjaminHCCarr/PropagandaTiles](https://github.com/BenjaminHCCarr/PropagandaTiles)) | GPL-2.0 |

Some icons are recreations of Microsoft designs and trademarks (for example the Windows flag on `start`,
in both icon sets, and the Internet Explorer logo on `internet`). Replace those if that matters for your site.

[98.css](https://github.com/jdan/98.css) is © Jordan Scales, MIT, and is loaded from its CDN rather than bundled.
