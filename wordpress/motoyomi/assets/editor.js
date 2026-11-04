/* Motoyomi local editor controls. GPL-2.0-or-later. Source; no build step. */
(function () {
    'use strict';
    var __ = wp.i18n.__, config = window.motoyomiIL;
    var api = function (path, data) { return wp.apiFetch({ path: '/motoyomi/v1/' + path, method: data ? 'POST' : 'GET', data: data, headers: { 'X-WP-Nonce': config.nonce } }); };
    function node(tag, text, parent) { var el = document.createElement(tag); if (text) el.textContent = text; if (parent) parent.appendChild(el); return el; }
    function button(text, parent, action) { var el = node('button', text, parent); el.type = 'button'; el.className = 'button button-small'; el.style.margin = '3px'; el.addEventListener('click', action); return el; }
    function escapeHTML(text) { var el = node('span', text); return el.innerHTML.replace(/"/g, '&quot;'); }
    function blockMode() { return config.block && wp.data.select('core/editor'); }
    function values() {
        if (blockMode()) { var store = wp.data.select('core/editor'); return { id: store.getCurrentPostId(), title: store.getEditedPostAttribute('title') || '', content: store.getEditedPostContent() }; }
        var title = document.getElementById('title'), content = document.getElementById('content');
        var tiny = window.tinymce && window.tinymce.get('content');
        return { id: Number(document.getElementById('post_ID').value), title: title ? title.value : '', content: tiny && !tiny.isHidden() ? tiny.getContent() : content.value };
    }
    function allBlocks(blocks) { return blocks.reduce(function (rows, block) { return rows.concat([block], allBlocks(block.innerBlocks || [])); }, []); }
    function findPhrase(phrase, status) {
        if (blockMode()) {
            var blocks = allBlocks(wp.data.select('core/block-editor').getBlocks());
            var found = blocks.find(function (block) { var text = node('div'); text.innerHTML = wp.blocks.serialize(block); return text.textContent.indexOf(phrase) >= 0; });
            if (found) { wp.data.dispatch('core/block-editor').selectBlock(found.clientId); status.textContent = __('The matching block is selected. Add the link using the toolbar.', 'motoyomi'); }
            else status.textContent = __('Phrase not found. Refresh suggestions after editing.', 'motoyomi');
        } else {
            var tiny = window.tinymce && window.tinymce.get('content');
            if (tiny && !tiny.isHidden()) {
                var walker = document.createTreeWalker(tiny.getBody(), NodeFilter.SHOW_TEXT), current;
                while ((current = walker.nextNode())) { var pos = current.nodeValue.indexOf(phrase); if (pos !== -1) { var range = tiny.getDoc().createRange(); range.setStart(current, pos); range.setEnd(current, pos + phrase.length); tiny.selection.setRng(range); tiny.focus(); return; } }
            }
            var content = document.getElementById('content'), index = content.value.indexOf(phrase);
            if (index >= 0) { content.focus(); content.setSelectionRange(index, index + phrase.length); }
            else status.textContent = __('Phrase not found. Refresh suggestions after editing.', 'motoyomi');
        }
    }
    function append(rows, status) {
        if (!rows.length) { status.textContent = __('Select related articles first.', 'motoyomi'); return; }
        var current = values().content; rows = rows.filter(function (row) { return current.indexOf(escapeHTML(row.url)) === -1; });
        if (blockMode()) {
            var editor = wp.data.select('core/block-editor'), dispatch = wp.data.dispatch('core/block-editor');
            var lists = editor.getBlocks().filter(function (b) { return b.name === 'core/list' && String(b.attributes.className || '').split(' ').includes('motoyomi-related'); });
            var list = lists[0], existing = list ? wp.blocks.serialize(list) : '';
            var items = rows.filter(function (row) { return existing.indexOf(escapeHTML(row.url)) === -1; }).map(function (row) { return wp.blocks.createBlock('core/list-item', { content: '<a href="' + escapeHTML(row.url) + '">' + escapeHTML(row.title) + '</a>' }); });
            if (list) dispatch.insertBlocks(items, list.innerBlocks.length, list.clientId);
            else if (items.length) dispatch.insertBlocks(wp.blocks.createBlock('core/list', { className: 'motoyomi-related' }, items), editor.getBlocks().length);
        } else {
            var html = '<ul class="motoyomi-related">' + rows.map(function (row) { return '<li><a href="' + escapeHTML(row.url) + '">' + escapeHTML(row.title) + '</a></li>'; }).join('') + '</ul>';
            var tiny = window.tinymce && window.tinymce.get('content');
            if (tiny && !tiny.isHidden()) { tiny.setContent(tiny.getContent() + html); tiny.fire('change'); }
            else { var content = document.getElementById('content'); content.value += '\n' + html; content.dispatchEvent(new Event('input', { bubbles: true })); }
        }
        status.textContent = __('Added to the end. Review and save your article.', 'motoyomi');
    }
    function mount(root) {
        var status = node('p', __('Titles and headings only. No external services.', 'motoyomi'), root); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
        var results = node('div', '', root), next = 0;
        var refresh = button(__('Find suggestions', 'motoyomi'), root, function () {
            if (Date.now() < next) return;
            next = Date.now() + 2000; refresh.disabled = true; status.textContent = __('Finding suggestions…', 'motoyomi');
            api('related', values()).then(function (data) {
                results.replaceChildren(); var chosen = [];
                if (!data.index.count) status.textContent = __('No index yet. Open Internal links settings and rebuild the index.', 'motoyomi');
                else if (!data.related.length && !data.links.length) status.textContent = __('No suggestions. No articles share title or heading terms.', 'motoyomi');
                else status.textContent = __('Suggestions ready. Content has not changed.', 'motoyomi');
                if (data.index.updated && Date.now() / 1000 - data.index.updated > 86400) node('p', __('The index is older than one day. Rebuild if recent articles are missing.', 'motoyomi'), results);
                var settings = node('a', __('Internal links settings', 'motoyomi'), results); settings.href = config.settings;
                [['links', __('Phrases to link', 'motoyomi')], ['related', __('Related articles', 'motoyomi')]].forEach(function (section) {
                    node('h3', section[1], results);
                    data[section[0]].forEach(function (row) {
                        var item = node('div', '', results); item.style.marginBottom = '14px';
                        if (row.anchor_text) node('strong', row.anchor_text, item);
                        var title = node('a', row.title, node('p', '', item)); title.href = row.url; title.target = '_blank'; title.rel = 'noopener noreferrer';
                        node('small', row.url, item);
                        node('p', ({ high: __('High', 'motoyomi'), medium: __('Medium', 'motoyomi'), low: __('Low', 'motoyomi') })[row.level], item);
                        button(__('Copy link', 'motoyomi'), item, function () {
                            if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(row.url).then(function () { status.textContent = __('Link copied.', 'motoyomi'); }).catch(function () { fallbackCopy(row.url, item); });
                            else fallbackCopy(row.url, item);
                        });
                        if (row.anchor_text) button(__('Find phrase', 'motoyomi'), item, function () { findPhrase(row.anchor_text, status); });
                        else { var label = node('label', '', item), input = node('input', '', label); input.type = 'checkbox'; label.appendChild(document.createTextNode(__(' Select for related list', 'motoyomi'))); input.addEventListener('change', function () { if (input.checked) chosen.push(row); else chosen = chosen.filter(function (r) { return r.id !== row.id; }); }); }
                    });
                });
                if (data.related.length) button(__('Add selected to end', 'motoyomi'), results, function () { append(chosen, status); });
            }).catch(function (error) { status.textContent = error.code === 'rest_forbidden' ? __('You cannot edit this article. Sign in and try again.', 'motoyomi') : __('Could not retrieve suggestions. Saving is still available.', 'motoyomi'); }).finally(function () { setTimeout(function () { refresh.disabled = false; }, Math.max(0, next - Date.now())); });
        });
    }
    function fallbackCopy(url, parent) { var field = node('input', '', parent); field.type = 'text'; field.readOnly = true; field.value = url; field.setAttribute('aria-label', __('Copy this URL', 'motoyomi')); field.focus(); field.select(); }
    function start() {
        var progress = document.getElementById('motoyomi-progress');
        if (progress) {
            var settingsForm = document.getElementById('motoyomi-settings');
            settingsForm.addEventListener('keydown', function (event) { if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA' && event.target.tagName !== 'BUTTON' && event.target.type !== 'submit') event.preventDefault(); });
            function update(data) {
                var p = data.progress, states = { running: __('Indexing', 'motoyomi'), complete: __('Complete', 'motoyomi'), failed: __('Failed', 'motoyomi') };
                progress.textContent = (states[p.state] || __('No index', 'motoyomi')) + ': ' + data.count + ' / ' + (p.total || 0) + ' — ' + (data.updated ? new Date(data.updated * 1000).toLocaleString() : '—') + (p.error ? ' — ' + p.error : '');
                if (p.state === 'running') api('batch', {}).then(update).catch(function () { progress.textContent = __('Indexing paused. Use Resume indexing.', 'motoyomi'); });
            }
            api('status').then(update).catch(function () { progress.textContent = __('Could not load index status.', 'motoyomi'); });
        }
        if (config.block) {
            var Panel = (wp.editor && wp.editor.PluginDocumentSettingPanel) || (wp.editPost && wp.editPost.PluginDocumentSettingPanel);
            if (Panel) {
                wp.plugins.registerPlugin('motoyomi-links', { render: function () {
                    return wp.element.createElement(Panel, { name: 'related', title: __('Related articles and internal links', 'motoyomi') }, wp.element.createElement('div', { ref: function (el) { if (el && !el.dataset.motoyomiMounted) { el.dataset.motoyomiMounted = '1'; mount(el); } } }));
                } });
                return;
            }
        }
        var classic = document.getElementById('motoyomi-classic'); if (classic) mount(classic);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}());
