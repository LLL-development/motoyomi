=== Motoyomi Internal Links ===
Tags: internal links, related posts, japanese, editor
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Find Japanese internal-link phrases and related articles from local titles and headings. No account, external service, or automatic content rewriting.

== Description ==

Motoyomi helps editors find existing published articles to link to while writing. This beta uses Japanese character bigrams, title/heading weights and local inverse-document-frequency weights. It normalizes fullwidth text, letter case and model-number hyphens (AB-1200 / AB1200).

* Suggestions use titles and h2–h4 headings, not semantic AI or full-text embeddings.
* Phrase suggestions retain the original spelling in your article.
* Your current article, existing link targets, password-protected/private articles and excluded paths are omitted.
* Choose articles and explicitly press “Add selected to end” to append a related list. Every other panel operation leaves content unchanged.
* Works with the WordPress block editor and the standard classic editor. Other page-builder canvases are not supported.
* Indexes saved published posts; settings let you select public post types and exclude path prefixes.
* Indexing runs in resumable batches of 50. The settings page also processes batches while open, including sites without WP-Cron.
* Japanese and English interfaces. No account, payments, analytics or telemetry.

Review every suggested link yourself. Machine-generated fixture tests do not establish human relevance or search-ranking effects. This is an initial beta; broader theme, editor and language compatibility is still being evaluated.

= External services and privacy =

None. This version sends nothing to external services. Browser requests only go to your own WordPress site. It stores a local index, settings and rebuild progress; uninstall removes these. Normal WordPress core or other installed plugins may independently make requests.

A future major version may offer an optional external-service connection. Such a connection is not implemented in this version and would require separate explicit consent before communication.

== Installation ==

1. Upload the motoyomi folder to wp-content/plugins, or install the ZIP via Plugins > Add New > Upload Plugin.
2. Activate separately on each site. Network activation is intentionally blocked.
3. Open Settings > Internal links. Select post types, review excluded paths, and wait for indexing to complete.
4. Open a post. In the document settings open “Related articles and internal links” and press “Find suggestions”. Classic editor users use the matching side metabox.
5. Use “Copy link” or “Find phrase” to add links manually. To append related articles, select checkboxes and press “Add selected to end”. Review and save your post.

== Frequently Asked Questions ==

= Does it change my content automatically? =

No. Only “Add selected to end” changes the editor content, and you still choose when to save. Phrase search selects a block or text; it does not create a link.

= Does it need an API key or paid service? =

No. All comparisons happen on your WordPress server. This version is free and has no external service.

= Why are there no suggestions? =

Open Settings > Internal links and check that the index is complete. Check selected post types and excluded paths. Candidates need matching title/heading terms or phrases; unrelated articles may correctly yield no result.

= Indexing stopped. What should I do? =

Open Settings > Internal links and press Resume indexing. Rebuild starts from the beginning; Resume retains the cursor. Keep settings open to run batches when scheduled cron is disabled.

= Does it work with plain permalinks? =

Yes. Post ID query parameters are retained as local URL identities. Path exclusions are prefixes; excluding / excludes the whole site.

= Does it support private, password-protected or draft articles? =

These are never suggestion targets. You can request suggestions while editing your own draft if you have permission to edit it.

= How many articles can I index? =

The first 2,000 index entries use one non-autoloaded JSON option. Above that the plugin moves entries into individual post metadata. Performance on large production sites has not yet been measured; start with a narrower post-type scope.

= Where can I report a problem? =

Contact LLL Inc. at its existing company contact address, contact@lx3.cafe. Include WordPress/PHP versions and reproduction steps. Do not send passwords or private article content.

== Changelog ==

= 0.1.0 =
* Initial beta: local Japanese phrases, related articles, block/classic editor controls and resumable indexing.
