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

function VoucherComponent({ onShowToast }) {
    const [vouchers, setVouchers] = React.useState([]);

    const fetchVouchers = async () => {
        const { data, error } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Gagal load vouchers:", error.message);
        } else if (data) {
            setVouchers(data);
        }
    };

    React.useEffect(() => {
        fetchVouchers();
    }, []);

    const handleCreateVoucher = async (e) => {
        e.preventDefault();
        const code = e.target.code.value.trim().toUpperCase();
        const discount = Math.abs(Number(e.target.discount.value));
        const quota = Math.abs(Number(e.target.quota.value));

        if (code.length >= 3 && discount > 0 && quota > 0) {
            const { error } = await supabase.from('vouchers').insert([{ code, discount_amount: discount, quota, used_count: 0, is_active: true }]);
            if (error) {
                onShowToast?.("Gagal membuat voucher: " + error.message, "error");
            } else {
                onShowToast?.("Voucher berhasil dibuat! 🎉", "success");
                e.target.reset();
                fetchVouchers();
            }
        } else {
            onShowToast?.("Data tidak valid. Kode min 3 huruf, Diskon & Kuota harus lebih dari 0.", "error");
        }
    };

    const handleToggleVoucher = async (code, currentActive) => {
        const { error } = await supabase.from('vouchers').update({ is_active: !currentActive }).eq('code', code);
        if (error) {
            onShowToast?.("Gagal merubah status voucher: " + error.message, "error");
        } else {
            onShowToast?.("Status voucher berhasil diperbarui!", "success");
            fetchVouchers();
        }
    };

    const handleDeleteVoucher = async (code) => {
        if (confirm("Hapus kode voucher ini?")) {
            const { error } = await supabase.from('vouchers').delete().eq('code', code);
            if (error) {
                onShowToast?.("Gagal menghapus voucher: " + error.message, "error");
            } else {
                onShowToast?.("Voucher berhasil dihapus!", "success");
                fetchVouchers();
            }
        }
    };

    return (
        <div className="animate-in fade-in flex flex-col h-full text-left">
            <form onSubmit={handleCreateVoucher} className="glass-panel rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Buat Voucher Baru</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Kode Voucher</label>
                        <input type="text" name="code" required placeholder="Cth: 18STUDIO" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 uppercase text-white" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Potongan Harga (Rp)</label>
                        <input type="number" name="discount" required placeholder="200000" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Batas Kuota</label>
                        <input type="number" name="quota" required placeholder="50" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-white" />
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="w-full bg-white text-black hover:bg-gray-200 py-2 rounded-lg text-sm font-medium transition">Simpan Voucher</button>
                    </div>
                </div>
            </form>

            <div className="glass-panel rounded-2xl p-6 flex-1">
                <h3 className="text-lg font-semibold mb-4 border-b border-white/10 pb-3">Daftar Voucher</h3>
                <div className="space-y-3">
                    {vouchers.map((v, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-dashed border-white/20">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-mono text-lg font-bold text-yellow-400 tracking-wider">{v.code}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${v.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{v.is_active ? 'Aktif' : 'Nonaktif'}</span>
                                </div>
                                <p className="text-sm text-gray-300">Potongan: {formatRupiah(v.discount_amount)}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <p className="text-xs text-gray-400">Terpakai: <span className="text-white font-medium">{v.used_count} / {v.quota}</span> kali</p>
                                <div className="flex gap-2">
                                    <button onClick={() => handleToggleVoucher(v.code, v.is_active)} className={`text-[10px] px-3 py-1.5 rounded transition ${v.is_active ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                                        {v.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                    </button>
                                    <button onClick={() => handleDeleteVoucher(v.code)} className="text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded">Hapus</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {vouchers.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-6">Belum ada voucher yang aktif.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VoucherComponent;
export { VoucherComponent };
