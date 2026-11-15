---
title: "Shortcodes"
date: 2026-11-08
tags: ["meta", "shortcodes"]
categories: ["General"]
---

The theme comes with a few shortcodes for building UI inside a post.

## window

{{< window title="readme.txt" status="Ready" >}}
Windows can hold **any Markdown**, including lists:

- one
- two
{{< /window >}}

## dialog

{{< dialog type="warning" title="Disk Space" button="OK" >}}
You are running out of disk space on drive **C:**.
{{< /dialog >}}

{{< dialog type="error" title="Error" >}}
A fatal exception has occurred. Press any key to continue.
{{< /dialog >}}

## fieldset

{{< fieldset legend="Display settings" >}}
Fieldsets group related content, just like a settings dialog.
{{< /fieldset >}}

## button

{{< button href="/posts/" >}}Open Posts{{< /button >}}

## Raw 98.css

You can also write 98.css markup directly in a post. Hugo's Markdown
renderer strips raw HTML by default, so turn it on with
`markup.goldmark.renderer.unsafe = true` first.
