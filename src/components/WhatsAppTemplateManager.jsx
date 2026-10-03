import React from 'react';

const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

// Mirror of server-side renderer (waTemplates.js): lines with empty/unknown placeholders are dropped.
const renderTemplate = (body, vars) => {
    const lines = [];
    (body || '').split('\n').forEach(line => {
        const names = [...line.matchAll(PLACEHOLDER_REGEX)].map(m => m[1]);
        if (names.length === 0) {
            lines.push(line);
            return;
        }
        const hasEmpty = names.some(n => vars[n] === undefined || vars[n] === null || String(vars[n]).trim() === '');
        if (hasEmpty) return;
        lines.push(line.replace(PLACEHOLDER_REGEX, (_, n) => String(vars[n])));
    });
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const escapeHtml = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Basic WhatsApp formatting: *bold*, _italic_, ~strike~, `code`
const formatWhatsApp = (text) => escapeHtml(text)
    .replace(/`([^`\n]+)`/g, '<code class="px-1 rounded bg-black/10 font-mono text-[0.85em]">$1</code>')
    .replace(/(^|[\s(>"])\*([^*\n]+)\*(?=[\s).,!?:;<"]|$)/gm, '$1<strong>$2</strong>')
    .replace(/(^|[\s(>"])_([^_\n]+)_(?=[\s).,!?:;<"]|$)/gm, '$1<em>$2</em>')
    .replace(/(^|[\s(>"])~([^~\n]+)~(?=[\s).,!?:;<"]|$)/gm, '$1<del>$2</del>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<span class="text-[#027eb5] underline break-all">$1</span>')
    .replace(/\n/g, '<br/>');

const GROUP_ORDER = ['Pembayaran', 'Jadwal', 'Pengerjaan', 'Serah Terima', 'Lainnya'];

export default function WhatsAppTemplateManager({ adminFetch, onShowToast }) {
    const [templates, setTemplates] = React.useState([]);
    const [drafts, setDrafts] = React.useState({});
    const [activeKey, setActiveKey] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    const [isTesting, setIsTesting] = React.useState(false);
    const [testPhone, setTestPhone] = React.useState('');
    const textareaRef = React.useRef(null);

    const fetchTemplates = React.useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            const res = await adminFetch('/api/wa-templates');
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Gagal memuat template');
            setTemplates(data.templates || []);
            const nextDrafts = {};
            (data.templates || []).forEach(t => { nextDrafts[t.key] = t.body; });
            setDrafts(nextDrafts);
            setActiveKey(prev => prev && nextDrafts[prev] !== undefined ? prev : (data.templates?.[0]?.key || ''));
        } catch (err) {
            setLoadError(err.message || 'Gagal memuat template WhatsApp');
        } finally {
            setIsLoading(false);
        }
    }, [adminFetch]);

    React.useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const activeTemplate = templates.find(t => t.key === activeKey);
    const activeDraft = drafts[activeKey] ?? '';

    const dirtyKeys = templates.filter(t => (drafts[t.key] ?? '') !== t.body).map(t => t.key);
    const isActiveDirty = dirtyKeys.includes(activeKey);

    const sampleVars = React.useMemo(() => {
        const vars = {};
        (activeTemplate?.variables || []).forEach(v => { vars[v.name] = v.sample; });
        return vars;
    }, [activeTemplate]);

    const unknownVars = React.useMemo(() => {
        if (!activeTemplate) return [];
        const allowed = new Set(activeTemplate.variables.map(v => v.name));
        const found = [...activeDraft.matchAll(PLACEHOLDER_REGEX)].map(m => m[1]).filter(n => !allowed.has(n));
        return [...new Set(found)];
    }, [activeDraft, activeTemplate]);

    const previewHtml = React.useMemo(() => formatWhatsApp(renderTemplate(activeDraft, sampleVars)), [activeDraft, sampleVars]);

    const groupedTemplates = React.useMemo(() => {
        const groups = {};
        templates.forEach(t => {
            if (!groups[t.group]) groups[t.group] = [];
            groups[t.group].push(t);
        });
        const rank = (g) => {
            const idx = GROUP_ORDER.indexOf(g);
            return idx === -1 ? GROUP_ORDER.length : idx;
        };
        return Object.keys(groups)
            .sort((a, b) => rank(a) - rank(b))
            .map(g => ({ group: g, items: groups[g] }));
    }, [templates]);

    const updateDraft = (value) => setDrafts(prev => ({ ...prev, [activeKey]: value }));

    const insertVariable = (name) => {
        const token = `{{${name}}}`;
        const el = textareaRef.current;
        if (!el) {
            updateDraft(activeDraft + token);
            return;
        }
        const start = el.selectionStart ?? activeDraft.length;
        const end = el.selectionEnd ?? activeDraft.length;
        const next = activeDraft.slice(0, start) + token + activeDraft.slice(end);
        updateDraft(next);
        requestAnimationFrame(() => {
            el.focus();
            const pos = start + token.length;
            el.setSelectionRange(pos, pos);
        });
    };

    const handleResetDefault = () => {
        if (!activeTemplate) return;
        if (!confirm(`Kembalikan template "${activeTemplate.label}" ke teks bawaan sistem? (Perubahan baru tersimpan setelah klik Simpan)`)) return;
        updateDraft(activeTemplate.defaultBody);
    };

    const handleDiscard = () => {
        if (!activeTemplate) return;
        updateDraft(activeTemplate.body);
    };

    const handleSave = async () => {
        if (dirtyKeys.length === 0) {
            onShowToast?.('Tidak ada perubahan template untuk disimpan.', 'info');
            return;
        }
        // Validate every dirty template
        for (const key of dirtyKeys) {
            const tpl = templates.find(t => t.key === key);
            const body = drafts[key] ?? '';
            if (!body.trim()) {
                onShowToast?.(`Template "${tpl.label}" tidak boleh kosong. Gunakan "Reset ke Default" jika ingin kembali ke bawaan.`, 'error');
                setActiveKey(key);
                return;
            }
            const allowed = new Set(tpl.variables.map(v => v.name));
            const bad = [...body.matchAll(PLACEHOLDER_REGEX)].map(m => m[1]).filter(n => !allowed.has(n));
            if (bad.length > 0) {
                onShowToast?.(`Template "${tpl.label}" memakai variabel tidak dikenal: ${[...new Set(bad)].map(v => `{{${v}}}`).join(', ')}`, 'error');
                setActiveKey(key);
                return;
            }
        }

        setIsSaving(true);
        try {
            const payload = {};
            dirtyKeys.forEach(k => { payload[k] = drafts[k]; });
            const res = await adminFetch('/api/wa-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templates: payload })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menyimpan template');
            setTemplates(data.templates || []);
            const nextDrafts = {};
            (data.templates || []).forEach(t => { nextDrafts[t.key] = t.body; });
            setDrafts(nextDrafts);
            onShowToast?.(`${dirtyKeys.length} template WhatsApp berhasil disimpan! ✨`, 'success');
        } catch (err) {
            onShowToast?.(err.message || 'Gagal menyimpan template WhatsApp', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestSend = async () => {
        const phone = testPhone.replace(/[^0-9]/g, '');
        if (phone.length < 9) {
            onShowToast?.('Masukkan nomor WhatsApp tujuan uji coba yang valid.', 'error');
            return;
        }
        if (unknownVars.length > 0) {
            onShowToast?.('Perbaiki variabel tidak dikenal sebelum mengirim uji coba.', 'error');
            return;
        }
        setIsTesting(true);
        try {
            const res = await adminFetch('/api/wa-templates/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: activeKey, body: activeDraft, phone })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengirim uji coba');
            onShowToast?.(data.message || 'Pesan uji coba terkirim!', 'success');
        } catch (err) {
            onShowToast?.(err.message || 'Gagal mengirim uji coba', 'error');
        } finally {
            setIsTesting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="glass-panel p-6 rounded-2xl flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
                <span className="text-sm text-gray-400">Memuat template WhatsApp...</span>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="glass-panel p-6 rounded-2xl">
                <p className="text-sm text-red-400 mb-3">⚠️ {loadError}</p>
                <button type="button" onClick={fetchTemplates} className="text-xs font-semibold px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white transition">
                    Coba Lagi
                </button>
            </div>
        );
    }

    return (
        <div className="glass-panel p-4 sm:p-6 rounded-2xl w-full min-w-0" id="wa-template-manager">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-white/10 pb-4 mb-4">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-lg">💬</div>
                    <div className="min-w-0">
                        <h3 className="text-md font-semibold text-white">Template Pesan WhatsApp Klien</h3>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                            Ubah isi pesan otomatis yang dikirim ke klien. Gunakan variabel <code className="text-emerald-300">{'{{nama_variabel}}'}</code> agar data terisi otomatis.
                        </p>
                    </div>
                </div>
                {dirtyKeys.length > 0 && (
                    <span className="self-start shrink-0 text-[11px] font-semibold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {dirtyKeys.length} belum disimpan
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-4">
                {/* Template list - mobile: select, desktop: sidebar */}
                <div className="lg:hidden">
                    <label htmlFor="wa-template-select" className="text-xs text-gray-400 block mb-1">Pilih Template</label>
                    <select
                        id="wa-template-select"
                        value={activeKey}
                        onChange={(e) => setActiveKey(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-500 text-white"
                    >
                        {groupedTemplates.map(g => (
                            <optgroup key={g.group} label={g.group} className="bg-[#111]">
                                {g.items.map(t => (
                                    <option key={t.key} value={t.key} className="bg-[#111]">
                                        {t.label}{dirtyKeys.includes(t.key) ? ' •' : ''}{t.isCustom ? ' (Kustom)' : ''}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                <nav className="hidden lg:block space-y-4 lg:max-h-[640px] lg:overflow-y-auto pr-1" aria-label="Daftar template WhatsApp">
                    {groupedTemplates.map(g => (
                        <div key={g.group}>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 px-1">{g.group}</p>
                            <div className="space-y-1">
                                {g.items.map(t => {
                                    const isActive = t.key === activeKey;
                                    const isDirty = dirtyKeys.includes(t.key);
                                    return (
                                        <button
                                            type="button"
                                            key={t.key}
                                            id={`wa-template-tab-${t.key}`}
                                            onClick={() => setActiveKey(t.key)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between gap-2 border ${isActive ? 'bg-emerald-500/15 border-emerald-500/40 text-white' : 'border-transparent text-gray-300 hover:bg-white/5'}`}
                                        >
                                            <span className="truncate">{t.label}</span>
                                            <span className="flex items-center gap-1 shrink-0">
                                                {t.isCustom && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">Kustom</span>}
                                                {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Belum disimpan"></span>}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Editor & preview */}
                {activeTemplate && (
                    <div className="min-w-0 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{activeTemplate.label}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${activeTemplate.isCustom ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                                {activeTemplate.isCustom ? 'Kustom' : 'Bawaan Sistem'}
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400 -mt-2">{activeTemplate.description}</p>

                        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                            {/* Editor */}
                            <div className="min-w-0 flex flex-col">
                                <label htmlFor="wa-template-editor" className="text-xs text-gray-400 mb-1 flex justify-between">
                                    <span>Isi Pesan</span>
                                    <span className={activeDraft.length > 4000 ? 'text-red-400' : 'text-gray-500'}>{activeDraft.length}/4000</span>
                                </label>
                                <textarea
                                    id="wa-template-editor"
                                    ref={textareaRef}
                                    value={activeDraft}
                                    onChange={(e) => updateDraft(e.target.value)}
                                    spellCheck={false}
                                    className="w-full min-h-[320px] 2xl:min-h-[420px] flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-3 text-[13px] leading-relaxed font-mono outline-none focus:border-emerald-500 text-white resize-y"
                                />
                                {unknownVars.length > 0 && (
                                    <p className="text-[11px] text-red-400 mt-1.5">
                                        ⚠️ Variabel tidak dikenal: {unknownVars.map(v => `{{${v}}}`).join(', ')}
                                    </p>
                                )}
                                <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                                    Format WA: <code>*tebal*</code>, <code>_miring_</code>, <code>~coret~</code>. Baris yang berisi variabel kosong (mis. sandi login / ruangan) otomatis disembunyikan.
                                </p>
                            </div>

                            {/* Preview */}
                            <div className="min-w-0 flex flex-col">
                                <span className="text-xs text-gray-400 mb-1">Pratinjau (data contoh)</span>
                                <div className="flex-1 min-h-[320px] 2xl:min-h-[420px] rounded-lg border border-white/10 p-3 sm:p-4 overflow-y-auto" style={{ background: 'linear-gradient(180deg,#0b141a,#101d24)' }}>
                                    <div className="max-w-full sm:max-w-[92%] bg-[#d9fdd3] text-[#111b21] rounded-lg rounded-tl-none px-3 py-2 shadow text-[13px] leading-relaxed break-words">
                                        {previewHtml
                                            ? <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                                            : <span className="italic text-gray-500">Pesan kosong</span>}
                                        <div className="text-[10px] text-gray-500 text-right mt-1">12:00 ✓✓</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Variables */}
                        <div>
                            <p className="text-xs text-gray-400 mb-2">Variabel tersedia <span className="text-gray-500">(klik untuk menyisipkan di posisi kursor)</span></p>
                            <div className="flex flex-wrap gap-2">
                                {activeTemplate.variables.map(v => (
                                    <button
                                        type="button"
                                        key={v.name}
                                        onClick={() => insertVariable(v.name)}
                                        title={`${v.desc} — contoh: ${v.sample}`}
                                        className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 transition font-mono max-w-full truncate"
                                    >
                                        {`{{${v.name}}}`}
                                    </button>
                                ))}
                            </div>
                            <details className="mt-2">
                                <summary className="text-[11px] text-gray-500 cursor-pointer hover:text-gray-300">Lihat keterangan variabel</summary>
                                <ul className="mt-2 space-y-1">
                                    {activeTemplate.variables.map(v => (
                                        <li key={v.name} className="text-[11px] text-gray-400 break-words">
                                            <code className="text-emerald-300">{`{{${v.name}}}`}</code> — {v.desc}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-3 border-t border-white/10">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleResetDefault}
                                    disabled={activeDraft === activeTemplate.defaultBody}
                                    className="text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 disabled:opacity-40 transition"
                                >
                                    ↺ Reset ke Default
                                </button>
                                {isActiveDirty && (
                                    <button
                                        type="button"
                                        onClick={handleDiscard}
                                        className="text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 transition"
                                    >
                                        Batalkan Perubahan
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        id="wa-template-test-phone"
                                        value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                        placeholder="No. WA uji coba"
                                        className="flex-1 sm:w-40 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500 text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleTestSend}
                                        disabled={isTesting}
                                        className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-50 transition"
                                    >
                                        {isTesting ? 'Mengirim...' : '🧪 Kirim Uji'}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    id="wa-template-save"
                                    onClick={handleSave}
                                    disabled={isSaving || dirtyKeys.length === 0}
                                    className="text-sm font-semibold px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Menyimpan...
                                        </>
                                    ) : (
                                        `Simpan Template${dirtyKeys.length > 1 ? ` (${dirtyKeys.length})` : ''}`
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
