import React from "react";
import {
    supabase,
    adminFetch,
    formatRupiah,
    formatSelectedDateUI,
    getOrderDivisions,
    checkRole,
    compressImageIfNeeded
} from "../adminUtils";
import SvgIcon from "../SvgIcon";

function UserManagementComponent({ onShowToast }) {
    const [users, setUsers] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editId, setEditId] = React.useState(null);

    const [formData, setFormData] = React.useState({
        username: '',
        password: '',
        role: 'karyawan',
        display_name: ''
    });

    const fetchUsers = async () => {
        const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
        if (error) {
            onShowToast("Gagal memuat pengguna: " + error.message, "error");
        } else {
            setUsers(data || []);
        }
    };

    React.useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editId) {
            const { error } = await supabase.from('admin_users').update({
                username: formData.username,
                password: formData.password,
                role: formData.role,
                display_name: formData.display_name
            }).eq('id', editId);

            if (error) {
                onShowToast("Gagal mengubah pengguna: " + error.message, "error");
            } else {
                onShowToast("Pengguna berhasil diubah!", "success");
                setIsModalOpen(false);
                fetchUsers();
            }
        } else {
            const { error } = await supabase.from('admin_users').insert([{
                username: formData.username,
                password: formData.password,
                role: formData.role,
                display_name: formData.display_name
            }]);

            if (error) {
                onShowToast("Gagal menambah pengguna: " + (error.message.includes('unique constraint') ? 'Username sudah digunakan' : error.message), "error");
            } else {
                onShowToast("Pengguna berhasil ditambahkan!", "success");
                setIsModalOpen(false);
                fetchUsers();
            }
        }
    };

    const handleDeleteClick = async (id, username) => {
        if (username === 'owner') {
            onShowToast("Akun owner utama tidak dapat dihapus!", "error");
            return;
        }
        if (confirm(`Yakin ingin menghapus akses untuk "${username}"?`)) {
            const { error } = await supabase.from('admin_users').delete().eq('id', id);
            if (error) {
                onShowToast("Gagal menghapus pengguna: " + error.message, "error");
            } else {
                onShowToast("Pengguna berhasil dihapus!", "success");
                fetchUsers();
            }
        }
    };

    const openAddModal = () => {
        setEditId(null);
        setFormData({ username: '', password: '', role: 'karyawan', display_name: '' });
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
        setIsModalOpen(true);
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full relative text-left min-w-0">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold">Manajemen Akses</h2>
                    <p className="text-xs text-gray-400 mt-1">Kelola akun admin dan editor untuk login ke dashboard.</p>
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
                                <th className="px-6 py-4 font-semibold">Username</th>
                                <th className="px-6 py-4 font-semibold">Role / Hak Akses</th>
                                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition">
                                    <td className="px-6 py-4 text-white font-medium">{user.display_name}</td>
                                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">{user.username}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'owner' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                            user.role === 'editor_foto' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                user.role === 'editor_video' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' :
                                                    user.role === 'makeup' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                        user.role === 'studio' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                                            user.role === 'dekor' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                                'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                            }`}>
                                            {user.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openEditModal(user)} className="min-w-[44px] min-h-[44px] flex justify-center items-center p-2 bg-white/5 hover:bg-white/10 rounded-lg text-blue-400 transition" title="Edit">
                                            <SvgIcon name="edit-2" className="w-5 h-5" />
                                        </button>
                                        {user.username !== 'owner' && (
                                            <button onClick={() => handleDeleteClick(user.id, user.username)} className="min-w-[44px] min-h-[44px] flex justify-center items-center p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition" title="Hapus">
                                                <SvgIcon name="trash-2" className="w-5 h-5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 text-sm">Belum ada data pengguna.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden flex flex-col gap-4 p-4">
                        {users.map((user) => (
                            <div key={user.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-base text-white">{user.display_name}</div>
                                        <div className="text-gray-400 font-mono text-xs">{user.username}</div>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'owner' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                        user.role === 'editor_foto' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                            user.role === 'editor_video' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' :
                                                user.role === 'makeup' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                    user.role === 'studio' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                                        user.role === 'dekor' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                        }`}>
                                        {user.role.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-white/5 mt-1">
                                    <button onClick={() => openEditModal(user)} className="flex-1 min-w-[44px] min-h-[44px] flex justify-center items-center bg-white/5 hover:bg-white/10 rounded-lg text-blue-400 transition" title="Edit">
                                        <SvgIcon name="edit-2" className="w-5 h-5" />
                                    </button>
                                    {user.username !== 'owner' && (
                                        <button onClick={() => handleDeleteClick(user.id, user.username)} className="flex-1 min-w-[44px] min-h-[44px] flex justify-center items-center bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition" title="Hapus">
                                            <SvgIcon name="trash-2" className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {users.length === 0 && (
                            <div className="text-center text-gray-500 text-sm py-8">Belum ada data pengguna.</div>
                        )}
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 p-6 rounded-2xl w-full max-w-md relative animate-in zoom-in-95">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <SvgIcon name="x" className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Akun' : 'Tambah Akun Baru'}</h3>
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200 mb-4 leading-relaxed">
                            <strong className="text-blue-400 block mb-1">Penting:</strong>
                            Anda <b>wajib</b> mendaftarkan email dan password ini di menu <i>Authentication</i> pada Dashboard Supabase Anda agar user ini bisa login.
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Nama Tampilan (Display Name) *</label>
                                <input type="text" required placeholder="Cth: Bagas (Editor)" value={formData.display_name} onChange={e => setFormData({ ...formData, display_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Email Login (Harus sama dengan di Supabase) *</label>
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
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white font-mono" 
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Password *</label>
                                <input type="text" required placeholder="Masukkan password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Peran (Role) *</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                    {[
                                        { value: 'owner', label: 'Owner (Full Akses)' },
                                        { value: 'admin', label: 'Admin Pusat' },
                                        { value: 'karyawan', label: 'Karyawan (Semua)' },
                                        { value: 'editor_foto', label: 'Editor Foto Khusus' },
                                        { value: 'editor_foto_studio', label: 'Editor Foto Studio' },
                                        { value: 'editor_video', label: 'Editor Video Khusus' },
                                        { value: 'makeup', label: 'Lady Makeup (Rias)' },
                                        { value: 'studio', label: 'Studio Lapanbelas' },
                                        { value: 'dekor', label: 'Lapanbelas Dekorasi' }
                                    ].map(r => (
                                        <label key={r.value} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 bg-gray-900 border-white/10 rounded text-blue-500 focus:ring-blue-500 focus:ring-2"
                                                checked={formData.role ? formData.role.split(',').map(x => x.trim()).includes(r.value) : false}
                                                onChange={(e) => {
                                                    let roles = formData.role ? formData.role.split(',').map(x => x.trim()).filter(x => x) : [];
                                                    if (e.target.checked) roles.push(r.value);
                                                    else roles = roles.filter(x => x !== r.value);
                                                    setFormData({ ...formData, role: roles.join(',') });
                                                }}
                                            />
                                            {r.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition">Batal</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition">Simpan</button>
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
