import React from "react";
import {
    supabase,
    adminFetch,
    formatRupiah,
    formatSelectedDateUI,
    getOrderDivisions,
    checkRole,
    compressImageIfNeeded,
    ADMIN_MENU_CATEGORIES,
    ROLE_MENU_PRESETS
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

function UserManagementComponent({ onShowToast }) {
    const [users, setUsers] = React.useState([]);
    const [permissionsMap, setPermissionsMap] = React.useState({});
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editId, setEditId] = React.useState(null);
    const [selectedMenus, setSelectedMenus] = React.useState([]);
    const [saving, setSaving] = React.useState(false);

    const [formData, setFormData] = React.useState({
        username: '',
        password: '',
        role: 'karyawan',
        display_name: ''
    });

    // Helper kumpulkan semua menu ID yang tersedia
    const allMenuIds = React.useMemo(() => {
        const ids = [];
        ADMIN_MENU_CATEGORIES.forEach(cat => {
            cat.items.forEach(item => {
                if (!ids.includes(item.id)) ids.push(item.id);
            });
        });
        return ids;
    }, []);

    const fetchUsers = async () => {
        try {
            const { data: usersData, error: usersErr } = await supabase
                .from('admin_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (usersErr) {
                onShowToast("Gagal memuat pengguna: " + usersErr.message, "error");
            } else {
                setUsers(usersData || []);
            }

            // Ambil mapping hak akses menu dari tabel settings
            const { data: settingData, error: settingErr } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'admin_menu_permissions')
                .maybeSingle();

            if (!settingErr && settingData?.value) {
                const parsed = typeof settingData.value === 'string'
                    ? JSON.parse(settingData.value)
                    : settingData.value;
                setPermissionsMap(parsed || {});
            }
        } catch (err) {
            console.error('[UserManagement] fetch error:', err);
        }
    };

    React.useEffect(() => {
        fetchUsers();
    }, []);

    // Resolve menu aktif untuk seorang user
    const getUserAllowedMenus = (user) => {
        const roles = (user.role || '').split(',').map(r => r.trim());
        if (roles.includes('owner')) {
            return allMenuIds;
        }

        // Cek apakah ada konfigurasi spesifik tersimpan
        const userPerms = permissionsMap[user.id] || (user.username && permissionsMap[user.username.toLowerCase()]);
        if (Array.isArray(userPerms)) {
            return userPerms;
        }

        // Fallback ke preset role
        const combined = new Set();
        roles.forEach(r => {
            const preset = ROLE_MENU_PRESETS[r];
            if (preset) preset.forEach(m => combined.add(m));
        });
        return Array.from(combined);
    };

    const applyRolePreset = (presetKey) => {
        if (presetKey === 'all') {
            setSelectedMenus([...allMenuIds]);
            return;
        }
        if (presetKey === 'none') {
            setSelectedMenus([]);
            return;
        }
        const preset = ROLE_MENU_PRESETS[presetKey];
        if (preset) {
            setSelectedMenus([...preset]);
        }
    };

    const toggleMenu = (menuId) => {
        setSelectedMenus(prev => {
            if (prev.includes(menuId)) {
                return prev.filter(id => id !== menuId);
            } else {
                return [...prev, menuId];
            }
        });
    };

    const toggleCategory = (cat) => {
        const catItemIds = cat.items.map(i => i.id);
        const allSelected = catItemIds.every(id => selectedMenus.includes(id));
        if (allSelected) {
            // Uncheck all in category
            setSelectedMenus(prev => prev.filter(id => !catItemIds.includes(id)));
        } else {
            // Check all in category
            setSelectedMenus(prev => {
                const set = new Set([...prev, ...catItemIds]);
                return Array.from(set);
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let targetUserId = editId;
            const targetUsername = formData.username.trim().toLowerCase();

            if (editId) {
                const { error } = await supabase.from('admin_users').update({
                    username: targetUsername,
                    password: formData.password,
                    role: formData.role,
                    display_name: formData.display_name
                }).eq('id', editId);

                if (error) {
                    onShowToast("Gagal mengubah pengguna: " + error.message, "error");
                    setSaving(false);
                    return;
                }
            } else {
                const { data: inserted, error } = await supabase.from('admin_users').insert([{
                    username: targetUsername,
                    password: formData.password,
                    role: formData.role,
                    display_name: formData.display_name
                }]).select().single();

                if (error) {
                    onShowToast("Gagal menambah pengguna: " + (error.message.includes('unique constraint') ? 'Username sudah digunakan' : error.message), "error");
                    setSaving(false);
                    return;
                }
                if (inserted?.id) {
                    targetUserId = inserted.id;
                }
            }

            // Simpan Hak Akses Menu ke settings (admin_menu_permissions)
            const updatedMap = { ...permissionsMap };
            if (targetUserId) {
                updatedMap[targetUserId] = selectedMenus;
            }
            if (targetUsername) {
                updatedMap[targetUsername] = selectedMenus;
            }

            const { error: permErr } = await supabase
                .from('settings')
                .upsert({
                    key: 'admin_menu_permissions',
                    value: updatedMap
                }, { onConflict: 'key' });

            if (permErr) {
                console.warn('[UserManagement] Gagal menyimpan izin menu ke settings:', permErr.message);
            } else {
                setPermissionsMap(updatedMap);
            }

            onShowToast(editId ? "Pengguna & Hak Akses berhasil disimpan!" : "Pengguna baru berhasil ditambahkan!", "success");
            setIsModalOpen(false);
            fetchUsers();
        } catch (err) {
            console.error('[UserManagement] Submit error:', err);
            onShowToast("Terjadi kesalahan: " + (err.message || 'Gagal menyimpan'), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = async (id, username) => {
        if (username === 'owner' || username === 'admin@lapanbelas.id') {
            onShowToast("Akun owner utama tidak dapat dihapus!", "error");
            return;
        }
        if (confirm(`Yakin ingin menghapus akses untuk "${username}"?`)) {
            const { error } = await supabase.from('admin_users').delete().eq('id', id);
            if (error) {
                onShowToast("Gagal menghapus pengguna: " + error.message, "error");
            } else {
                // Hapus juga mapping permissions-nya
                const updatedMap = { ...permissionsMap };
                delete updatedMap[id];
                if (username) delete updatedMap[username.toLowerCase()];
                setPermissionsMap(updatedMap);

                await supabase.from('settings').upsert({
                    key: 'admin_menu_permissions',
                    value: updatedMap
                }, { onConflict: 'key' });

                onShowToast("Pengguna berhasil dihapus!", "success");
                fetchUsers();
            }
        }
    };

    const openAddModal = () => {
        setEditId(null);
        setFormData({ username: '', password: '', role: 'karyawan', display_name: '' });
        // Default preset karyawan
        setSelectedMenus([...ROLE_MENU_PRESETS.karyawan]);
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditId(user.id);
        setFormData({
            username: user.username,
            password: user.password,
            role: user.role,
            display_name: user.display_name
        });
        const currentMenus = getUserAllowedMenus(user);
        setSelectedMenus([...currentMenus]);
        setIsModalOpen(true);
    };

    const isOwnerRoleSelected = formData.role && formData.role.split(',').map(x => x.trim()).includes('owner');

    return (
        <div className="animate-in fade-in flex flex-col h-full relative text-left min-w-0">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold">Manajemen Akses</h2>
                    <p className="text-xs text-gray-400 mt-1">Kelola akun admin, editor, dan tentukan checklist menu apa saja yang boleh dibuka.</p>
                </div>
                <button onClick={openAddModal} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-lg flex items-center gap-2">
                    <SvgIcon name="plus" className="w-4 h-4" /> Tambah Akun
                </button>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 flex-1 flex flex-col min-w-0">
                <div className="overflow-x-auto flex-1 min-w-0">
                    <table className="hidden md:table w-full min-w-max text-sm text-left">
                        <thead className="text-xs text-gray-400 bg-black/40 uppercase border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Display Name</th>
                                <th className="px-6 py-4 font-semibold">Username / Email</th>
                                <th className="px-6 py-4 font-semibold">Role / Hak Akses</th>
                                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => {
                                const allowed = getUserAllowedMenus(user);
                                const isOwner = (user.role || '').includes('owner');
                                const hasCustom = Boolean(permissionsMap[user.id] || (user.username && permissionsMap[user.username.toLowerCase()]));

                                return (
                                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition">
                                        <td className="px-6 py-4 text-white font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
                                                    {(user.display_name || user.username || 'U').substring(0, 2).toUpperCase()}
                                                </div>
                                                <span>{user.display_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-300 font-mono text-xs">{user.username}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isOwner ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' :
                                                    user.role.includes('editor_foto') ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' :
                                                        user.role.includes('editor_video') ? 'bg-pink-500/15 text-pink-300 border border-pink-500/30' :
                                                            user.role.includes('makeup') ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' :
                                                                user.role.includes('studio') ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' :
                                                                    user.role.includes('dekor') ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                                                                        'bg-gray-500/15 text-gray-300 border border-gray-500/30'
                                                    }`}>
                                                    {user.role.replace(/_/g, ' ')}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isOwner
                                                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                                    : hasCustom
                                                        ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                                                        : 'bg-white/5 text-gray-400 border border-white/10'
                                                    }`}>
                                                    {isOwner ? (
                                                        <>👑 Full Akses (Semua Menu)</>
                                                    ) : (
                                                        <>✓ {allowed.length} Menu Terbuka {hasCustom ? '(Kustom)' : '(Preset)'}</>
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button onClick={() => openEditModal(user)} className="min-w-[40px] min-h-[40px] flex justify-center items-center p-2 bg-white/5 hover:bg-teal-500/20 hover:text-teal-300 rounded-lg text-blue-400 transition" title="Edit Hak Akses & Akun">
                                                <SvgIcon name="edit-2" className="w-4 h-4" />
                                            </button>
                                            {user.username !== 'owner' && (
                                                <button onClick={() => handleDeleteClick(user.id, user.username)} className="min-w-[40px] min-h-[40px] flex justify-center items-center p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition" title="Hapus Akun">
                                                    <SvgIcon name="trash-2" className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 text-sm">Belum ada data pengguna.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden flex flex-col gap-4 p-4">
                        {users.map((user) => {
                            const allowed = getUserAllowedMenus(user);
                            const isOwner = (user.role || '').includes('owner');
                            const hasCustom = Boolean(permissionsMap[user.id] || (user.username && permissionsMap[user.username.toLowerCase()]));

                            return (
                                <div key={user.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-base text-white">{user.display_name}</div>
                                            <div className="text-gray-400 font-mono text-xs">{user.username}</div>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isOwner ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' :
                                            user.role.includes('editor_foto') ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' :
                                                user.role.includes('editor_video') ? 'bg-pink-500/15 text-pink-300 border border-pink-500/30' :
                                                    user.role.includes('makeup') ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' :
                                                        user.role.includes('studio') ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' :
                                                            user.role.includes('dekor') ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                                                                'bg-gray-500/15 text-gray-300 border border-gray-500/30'
                                            }`}>
                                            {user.role.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                    <div className="text-xs">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${isOwner
                                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                            : hasCustom
                                                ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                                                : 'bg-white/5 text-gray-400 border border-white/10'
                                            }`}>
                                            {isOwner ? '👑 Full Akses (Semua Menu)' : `✓ ${allowed.length} Menu Terbuka ${hasCustom ? '(Kustom)' : '(Preset)'}`}
                                        </span>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5 mt-1">
                                        <button onClick={() => openEditModal(user)} className="flex-1 min-w-[44px] min-h-[44px] flex justify-center items-center bg-white/5 hover:bg-white/10 rounded-lg text-blue-400 transition" title="Edit">
                                            <SvgIcon name="edit-2" className="w-5 h-5 mr-1" /> Edit Hak Akses
                                        </button>
                                        {user.username !== 'owner' && (
                                            <button onClick={() => handleDeleteClick(user.id, user.username)} className="min-w-[44px] min-h-[44px] flex justify-center items-center px-3 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition" title="Hapus">
                                                <SvgIcon name="trash-2" className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {users.length === 0 && (
                            <div className="text-center text-gray-500 text-sm py-8">Belum ada data pengguna.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Tambah / Edit Akun & Checklist Granular Menu */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="glass-panel border border-teal-500/30 p-5 sm:p-6 rounded-2xl w-full max-w-3xl relative animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col shadow-2xl">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
                            <SvgIcon name="x" className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                                <SvgIcon name="shield" className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{editId ? 'Edit Akun & Hak Akses Menu' : 'Tambah Akun & Tentukan Hak Akses'}</h3>
                                <p className="text-xs text-gray-400">Pilih menu sidebar yang boleh dibuka dan digunakan oleh pengguna ini.</p>
                            </div>
                        </div>

                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200 mb-4 leading-relaxed">
                            <strong className="text-blue-400 block mb-0.5">Catatan Autentikasi:</strong>
                            Email dan password harus terdaftar di menu <i>Authentication Supabase</i> agar akun dapat login ke admin.
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-5">
                            {/* Baris 1: Display Name & Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-300 block mb-1">Nama Tampilan (Display Name) *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Cth: Bagas (Editor Foto)"
                                        value={formData.display_name}
                                        onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                                        className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 text-white placeholder-gray-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-300 block mb-1">Email Login (Supabase) *</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="Cth: editor@lapanbelas.id"
                                        value={formData.username}
                                        onChange={e => {
                                            const cleaned = e.target.value.toLowerCase().replace(/\s+/g, '');
                                            setFormData({ ...formData, username: cleaned });
                                        }}
                                        onPaste={e => {
                                            e.preventDefault();
                                            const pasteText = (e.clipboardData || window.clipboardData).getData('text');
                                            const cleaned = pasteText.toLowerCase().replace(/\s+/g, '');
                                            setFormData({ ...formData, username: cleaned });
                                        }}
                                        className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 text-white font-mono placeholder-gray-500 transition"
                                    />
                                </div>
                            </div>

                            {/* Baris 2: Password */}
                            <div>
                                <label className="text-xs font-semibold text-gray-300 block mb-1">Password *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Masukkan password akun"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 text-white placeholder-gray-500 transition"
                                />
                            </div>

                            {/* Baris 3: Peran (Role) */}
                            <div>
                                <label className="text-xs font-semibold text-gray-300 block mb-1.5">Peran Klasik (Role Dasar) *</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        { value: 'owner', label: '👑 Owner (Full Akses)' },
                                        { value: 'admin', label: 'Admin Pusat' },
                                        { value: 'karyawan', label: 'Karyawan (Semua)' },
                                        { value: 'editor_foto', label: 'Editor Foto Khusus' },
                                        { value: 'editor_foto_studio', label: 'Editor Foto Studio' },
                                        { value: 'editor_video', label: 'Editor Video Khusus' },
                                        { value: 'makeup', label: 'Lady Makeup (Rias)' },
                                        { value: 'studio', label: 'Studio Lapanbelas' },
                                        { value: 'dekor', label: 'Lapanbelas Dekorasi' }
                                    ].map(r => {
                                        const isChecked = formData.role ? formData.role.split(',').map(x => x.trim()).includes(r.value) : false;
                                        return (
                                            <label key={r.value} className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition ${isChecked ? 'bg-teal-500/15 border-teal-500/40 text-teal-300' : 'bg-slate-900/50 border-white/10 text-gray-400 hover:border-white/20'}`}>
                                                <input
                                                    type="checkbox"
                                                    className="w-3.5 h-3.5 rounded bg-black/60 border-white/20 text-teal-500 focus:ring-teal-500"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        let roles = formData.role ? formData.role.split(',').map(x => x.trim()).filter(Boolean) : [];
                                                        if (e.target.checked) roles.push(r.value);
                                                        else roles = roles.filter(x => x !== r.value);
                                                        const newRoleStr = roles.join(',');
                                                        setFormData({ ...formData, role: newRoleStr });

                                                        // Jika user memilih role tertentu dan belum ada menu yang dipilih, bantu pilihkan presetnya
                                                        if (e.target.checked && ROLE_MENU_PRESETS[r.value]) {
                                                            applyRolePreset(r.value);
                                                        }
                                                    }}
                                                />
                                                <span className="truncate">{r.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Baris 4: Granular Menu Permissions Checklist */}
                            <div className="pt-2 border-t border-white/10">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white">Checklist Hak Akses Menu</span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                                {isOwnerRoleSelected ? '👑 Semua Menu (Owner)' : `${selectedMenus.length} dari ${allMenuIds.length} Menu Terbuka`}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            Pilih menu apa saja yang tampil di sidebar pengguna ini. Menu yang tidak dicentang otomatis disembunyikan.
                                        </p>
                                    </div>

                                    {/* Quick Actions / Preset Buttons */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => applyRolePreset('all')}
                                            className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-[11px] font-medium transition"
                                        >
                                            ✓ Centang Semua
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyRolePreset('none')}
                                            className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[11px] font-medium transition"
                                        >
                                            ✕ Hapus Semua
                                        </button>
                                    </div>
                                </div>

                                {/* Preset Shortcut Pills */}
                                <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/10 mb-3 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] text-gray-400 font-semibold mr-1">Preset Cepat:</span>
                                    {[
                                        { key: 'owner', label: '👑 Owner (Semua)' },
                                        { key: 'admin', label: '🏢 Admin Pusat' },
                                        { key: 'editor_foto', label: '📸 Editor Foto' },
                                        { key: 'editor_video', label: '🎬 Editor Video' },
                                        { key: 'editor_foto_studio', label: '📷 Foto Studio' },
                                        { key: 'makeup', label: '💄 Lady Makeup' },
                                        { key: 'studio', label: '🎞️ Studio 18' },
                                        { key: 'dekor', label: '🎪 Dekorasi' }
                                    ].map(btn => (
                                        <button
                                            key={btn.key}
                                            type="button"
                                            onClick={() => applyRolePreset(btn.key)}
                                            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[10px] font-medium transition"
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Daftar Kategori & Menu Items */}
                                <div className="space-y-3">
                                    {ADMIN_MENU_CATEGORIES.map(cat => {
                                        const catItemIds = cat.items.map(i => i.id);
                                        const selectedCount = catItemIds.filter(id => selectedMenus.includes(id)).length;
                                        const isAllCatSelected = catItemIds.length > 0 && selectedCount === catItemIds.length;

                                        return (
                                            <div key={cat.category} className="bg-slate-900/60 border border-white/10 rounded-xl p-3">
                                                {/* Category Header */}
                                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                                                            <SvgIcon name={cat.icon} className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-xs font-bold text-white uppercase tracking-wider">{cat.category}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400">
                                                            {selectedCount}/{cat.items.length}
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCategory(cat)}
                                                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition ${isAllCatSelected
                                                            ? 'text-red-400 hover:bg-red-500/10'
                                                            : 'text-teal-400 hover:bg-teal-500/10'
                                                            }`}
                                                    >
                                                        {isAllCatSelected ? 'Batal Semua' : 'Pilih Semua'}
                                                    </button>
                                                </div>

                                                {/* Checkbox Grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {cat.items.map(item => {
                                                        const isChecked = selectedMenus.includes(item.id) || isOwnerRoleSelected;
                                                        return (
                                                            <label
                                                                key={item.id}
                                                                className={`flex items-start gap-2.5 p-2 rounded-lg border text-left cursor-pointer transition ${isChecked
                                                                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-200'
                                                                    : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/10'
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 mt-0.5 rounded bg-black/60 border-white/20 text-teal-500 focus:ring-teal-500"
                                                                    checked={isChecked}
                                                                    disabled={isOwnerRoleSelected}
                                                                    onChange={() => toggleMenu(item.id)}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-semibold text-white leading-tight">{item.label}</div>
                                                                    {item.desc && (
                                                                        <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{item.desc}</div>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tombol Simpan & Batal */}
                            <div className="pt-3 border-t border-white/10 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition text-gray-300"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold transition shadow-lg flex items-center justify-center gap-2"
                                >
                                    {saving ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : 'Tambahkan Akun')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagementComponent;
export { UserManagementComponent };
