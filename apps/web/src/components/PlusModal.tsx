'use client';

interface Props {
  onClose: () => void;
}

export default function PlusModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 className="font-display font-black text-lg text-navy">unlinked+ Plus</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">×</button>
        </div>

        {/* Banner */}
        <div className="bg-gradient-to-r from-navy to-blue-600 mx-4 mt-4 rounded-2xl p-4 text-white">
          <p className="text-xs font-bold mb-1">Pengalaman lebih nyaman, tanpa iklan!</p>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">☕</span>
            </div>
            <span className="text-sm font-medium">Support komunitas, dapatkan benefit eksklusif.</span>
          </div>
        </div>

        {/* Benefits */}
        <div className="px-4 mt-6">
          <h3 className="font-bold text-sm text-navy mb-3">Keuntungan Membership</h3>
          <div className="space-y-2">
            {[
              'Bebas Iklan di Feed',
              'Avatar Eksklusif Premium',
              'Badge Spesial: Mental Baja+',
              'Akses Konten Eksklusif',
              'Dukung Komunitas unlinked+',
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-background rounded-xl">
                <span className="text-primary font-bold">✓</span>
                <span className="text-sm text-navy">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Options */}
        <div className="px-4 mt-6 space-y-3">
          {/* Monthly */}
          <div className="border-2 border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-navy">Bulanan</span>
              <span className="font-bold text-navy">Rp19.000/bulan</span>
            </div>
            <button className="w-full bg-navy text-white font-bold py-2.5 rounded-xl text-sm hover:bg-navy/90 transition">
              Pilih Paket
            </button>
          </div>

          {/* Annual */}
          <div className="border-2 border-primary rounded-2xl p-4 bg-primary/5 relative">
            <div className="absolute -top-2 right-4 bg-primary text-navy text-xs font-bold px-3 py-1 rounded-full">
              Hemat 60%
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-navy">Tahunan</span>
              <span className="font-bold text-navy">Rp199.000/tahun</span>
            </div>
            <button className="w-full bg-primary text-navy font-bold py-2.5 rounded-xl text-sm hover:bg-primary/90 transition">
              Pilih Paket
            </button>
          </div>
        </div>

        {/* Payment Info */}
        <div className="px-4 mt-6 text-center">
          <p className="text-xs text-gray-500">
            Pembayaran aman & terpercaya melalui QRIS, kartu, dan e-wallet.
          </p>
        </div>

        {/* Upgrade Button */}
        <div className="px-4 py-6">
          <button className="w-full bg-navy text-white font-bold py-3 rounded-xl text-sm hover:bg-navy/90 transition">
            Upgrade Sekarang →
          </button>
        </div>
      </div>
    </div>
  );
}
