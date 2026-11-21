import { motion } from 'framer-motion'
import { FileText, Mail, ShieldCheck, X } from 'lucide-react'
import { useEffect } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { Pill } from '../../components/ui/atoms'
import { BlamNatureIcon } from '../../components/ui/bumpIcons'
import type { AppPath } from '../../lib/route'

function LegalSection({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="card-quiet p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="num grid size-7 shrink-0 place-items-center rounded-full border border-line bg-canvas text-[12px] text-forest">
          {number}
        </span>
        <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
      </div>
      <div className="mt-2.5 space-y-2.5 text-[14px] leading-relaxed text-ink-soft [&_strong]:text-ink">
        {children}
      </div>
    </section>
  )
}

function LegalTab({
  href,
  active,
  icon,
  label,
  onNavigate,
}: {
  href: '/privacy' | '/terms'
  active: boolean
  icon: ReactNode
  label: string
  onNavigate: (path: AppPath) => void
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    if (!active) onNavigate(href)
  }
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] px-4 text-[12px] font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-ink text-white' : 'btn-soft'
      }`}
    >
      {icon}
      {label}
    </a>
  )
}

function LegalShell({
  active,
  title,
  subtitle,
  onNavigate,
  onClose,
  children,
}: {
  active: 'privacy' | 'terms'
  title: string
  subtitle: string
  onNavigate: (path: AppPath) => void
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = active === 'privacy' ? 'Kebijakan Privasi - Blam' : 'Ketentuan Layanan - Blam'
    return () => {
      document.title = prevTitle
    }
  }, [active])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-ink/30 backdrop-blur-[2px] md:items-center md:p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[16px] border border-line bg-white shadow-[0_24px_48px_-12px_rgba(15,29,50,0.22)] md:max-h-[88dvh] md:max-w-[640px] md:rounded-[16px]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-canvas">
              <BlamNatureIcon className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] leading-tight font-semibold text-ink">Blam</span>
              <span className="block truncate text-[12px] font-medium text-ink-soft">Dokumen Legal</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="btn-soft size-10 shrink-0 !rounded-[10px] p-0"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-canvas px-4 pt-4 pb-6 sm:px-6">
          <nav aria-label="Dokumen legal Blam" className="flex gap-2">
            <LegalTab
              href="/privacy"
              active={active === 'privacy'}
              icon={<ShieldCheck className="size-4 shrink-0" strokeWidth={1.75} />}
              label="Kebijakan Privasi"
              onNavigate={onNavigate}
            />
            <LegalTab
              href="/terms"
              active={active === 'terms'}
              icon={<FileText className="size-4 shrink-0" strokeWidth={1.75} />}
              label="Ketentuan Layanan"
              onNavigate={onNavigate}
            />
          </nav>

          <div className="mt-5 border-b border-line pb-5">
            <Pill>{active === 'privacy' ? 'Privasi & Data' : 'Aturan Penggunaan'}</Pill>
            <h1 className="mt-3 text-[24px] leading-tight font-semibold text-ink">{title}</h1>
            <p className="mt-1.5 text-[12px] font-medium text-ink-soft">{subtitle}</p>
          </div>

          <div className="mt-5 flex flex-col gap-3">{children}</div>

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[12px] font-medium text-ink-soft">
            <span>&copy; 2026 Blam</span>
            <a
              href="mailto:blam@gmail.com"
              className="inline-flex items-center gap-1.5 font-semibold text-forest hover:underline"
            >
              <Mail className="size-4" strokeWidth={1.75} />
              blam@gmail.com
            </a>
          </footer>
        </div>
      </motion.div>
    </motion.div>
  )
}

type LegalProps = { onNavigate: (path: AppPath) => void; onClose: () => void }

export function LegalModal({ page, ...props }: LegalProps & { page: 'privacy' | 'terms' }) {
  return page === 'privacy' ? <PrivacyPage {...props} /> : <TermsPage {...props} />
}

function PrivacyPage({ onNavigate, onClose }: LegalProps) {
  return (
    <LegalShell
      active="privacy"
      title="Kebijakan Privasi Blam"
      subtitle="Terakhir diperbarui: 19 November 2026 · Berlaku untuk https://blam.itzyx.my.id"
      onNavigate={onNavigate}
      onClose={onClose}
    >
      <p className="px-1 text-[14px] leading-relaxed text-ink-soft [&_strong]:text-ink">
        <strong>Blam</strong> adalah platform radar konservasi untuk memantau, melaporkan, memverifikasi, dan
        menindaklanjuti ancaman terhadap hutan tropis, mangrove pesisir, serta daerah aliran sungai di Indonesia.
        Dokumen ini menjelaskan data yang kami kumpulkan, cara penggunaannya, serta hak Anda atas data tersebut.
      </p>

      <div className="card-quiet bg-mint/45 p-4 sm:p-5">
        <p className="text-[12px] font-semibold text-forest">
          Kepatuhan Google API Services User Data Policy (Limited Use)
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Penggunaan dan transfer informasi yang diterima Blam dari Google API mematuhi sepenuhnya{' '}
          <a
            href="https://developers.google.com/terms/api-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-forest underline decoration-leaf/40 underline-offset-2 hover:text-ink"
          >
            Google API Services User Data Policy
          </a>
          , termasuk persyaratan <em>Limited Use</em>. Data akun Google hanya digunakan untuk autentikasi dan profil di
          dalam Blam, tidak dijual kepada pihak ketiga, dan tidak dipakai untuk periklanan.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <LegalSection number="1" title="Informasi yang Kami Kumpulkan">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Data Akun Google (OAuth 2.0):</strong> Saat Anda masuk dengan Google, kami
              menerima <strong>nama lengkap</strong>, <strong>alamat email</strong>, dan <strong>foto profil</strong>{' '}
              sesuai cakupan izin standar (<code>openid</code>, <code>email</code>, <code>profile</code>).
            </li>
            <li>
              <strong className="text-ink">Data Pendaftaran Email:</strong> Nama lengkap, alamat email, dan kredensial
              terenkripsi apabila Anda mendaftar langsung menggunakan email dan kata sandi.
            </li>
            <li>
              <strong className="text-ink">Data Lokasi (GPS / Koordinat Peta):</strong> Koordinat lokasi perangkat atas
              izin browser atau titik peta yang Anda pilih saat mengirim laporan konservasi.
            </li>
            <li>
              <strong className="text-ink">Konten Laporan, Aksi, &amp; Donasi:</strong> Foto bukti lapangan, deskripsi
              ancaman ekosistem, keanggotaan organisasi/relawan, catatan verifikasi, serta catatan partisipasi donasi.
            </li>
            <li>
              <strong className="text-ink">Data Teknis &amp; Sesi:</strong> Penyimpanan lokal browser untuk menjaga sesi
              login dan log teknis dasar server guna menjaga keandalan sistem.
            </li>
          </ul>
        </LegalSection>

        <LegalSection number="2" title="Tujuan Penggunaan Data">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Membuat, mengamankan, dan mengelola akun serta profil pengguna Anda di Blam.</li>
            <li>Menampilkan identitas profil pada laporan lapangan, aktivitas relawan, dan keanggotaan organisasi.</li>
            <li>Memetakan, memverifikasi, dan mengoordinasikan tindak lanjut laporan ancaman lingkungan.</li>
            <li>Mencatat poin kontribusi relawan, status aksi lapangan, notifikasi akun, dan transparansi donasi.</li>
            <li>Mencegah laporan palsu, spam, dan penyalahgunaan layanan.</li>
          </ul>
        </LegalSection>

        <LegalSection number="3" title="Penyimpanan &amp; Pihak Ketiga">
          <p>Blam menggunakan penyedia infrastruktur berikut secara terbatas untuk menjalankan layanan:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-ink">Supabase:</strong> Autentikasi pengguna, basis data PostgreSQL, dan
              penyimpanan media laporan serta foto profil.
            </li>
            <li>
              <strong className="text-ink">Vercel:</strong> Hosting aplikasi web dan endpoint API serverless.
            </li>
            <li>
              <strong className="text-ink">Google OAuth:</strong> Layanan autentikasi saat Anda memilih tombol Masuk
              dengan Google.
            </li>
            <li>
              <strong className="text-ink">Layanan Peta &amp; Citra (OpenFreeMap, Esri, NASA FIRMS):</strong> Penyajian
              peta dan lapisan data lingkungan tanpa mengirimkan identitas akun Google Anda.
            </li>
          </ul>
        </LegalSection>

        <LegalSection number="4" title="Keamanan &amp; Retensi Data">
          <p>
            Seluruh komunikasi antara perangkat Anda dan server Blam dilindungi enkripsi HTTPS/TLS. Data akun disimpan
            selama akun Anda aktif atau selama diperlukan untuk integritas catatan laporan konservasi publik.
          </p>
        </LegalSection>

        <LegalSection number="5" title="Hak Pengguna &amp; Penghapusan Data">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Mengakses dan memperbarui nama atau foto profil langsung melalui tab Profil di Blam.</li>
            <li>
              Mencabut izin akses Google untuk Blam kapan saja melalui{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-forest underline decoration-leaf/40 underline-offset-2 hover:text-ink"
              >
                Izin Akun Google
              </a>
              .
            </li>
            <li>
              Meminta penghapusan akun dan data pribadi melalui email pengelola di{' '}
              <a
                href="mailto:blam@gmail.com"
                className="font-semibold text-forest underline decoration-leaf/40 underline-offset-2 hover:text-ink"
              >
                blam@gmail.com
              </a>
              .
            </li>
          </ul>
        </LegalSection>
      </div>
    </LegalShell>
  )
}

function TermsPage({ onNavigate, onClose }: LegalProps) {
  return (
    <LegalShell
      active="terms"
      title="Ketentuan Layanan Blam"
      subtitle="Terakhir diperbarui: 19 November 2026 · Berlaku untuk https://blam.itzyx.my.id"
      onNavigate={onNavigate}
      onClose={onClose}
    >
      <p className="px-1 text-[14px] leading-relaxed text-ink-soft [&_strong]:text-ink">
        Dengan mengakses atau menggunakan layanan <strong>Blam</strong>, Anda menyetujui Ketentuan Layanan ini serta{' '}
        <a
          href="/privacy"
          onClick={(e) => {
            e.preventDefault()
            onNavigate('/privacy')
          }}
          className="font-semibold text-forest underline decoration-leaf/40 underline-offset-2 hover:text-ink"
        >
          Kebijakan Privasi Blam
        </a>
        . Apabila Anda tidak menyetujui ketentuan ini, harap hentikan penggunaan layanan.
      </p>

      <div className="flex flex-col gap-3">
        <LegalSection number="1" title="Ruang Lingkup Layanan">
          <p>
            Blam adalah platform kolaborasi pemantauan dan aksi konservasi yang menghubungkan warga, relawan, komunitas,
            serta instansi untuk melaporkan, memverifikasi, dan menangani ancaman terhadap hutan, mangrove pesisir, dan
            daerah aliran sungai di Indonesia.
          </p>
        </LegalSection>

        <LegalSection number="2" title="Akun Pengguna">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Anda dapat masuk menggunakan akun email terdaftar atau akun Google (Google Sign-In).</li>
            <li>Anda bertanggung jawab menjaga keamanan akses akun serta aktivitas yang dilakukan melaluinya.</li>
            <li>Pengelola berhak membatasi atau menonaktifkan akun yang terbukti melanggar ketentuan layanan.</li>
          </ul>
        </LegalSection>

        <LegalSection number="3" title="Aturan Pelaporan &amp; Konten Pengguna">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Informasi, foto, dan titik lokasi laporan harus disampaikan secara jujur sesuai fakta lapangan.</li>
            <li>Dilarang mengunggah laporan palsu, spam, pelanggaran hak cipta, atau materi yang melanggar hukum.</li>
            <li>Utamakan keselamatan diri dan pihak lain saat mengambil dokumentasi di lokasi kejadian.</li>
          </ul>
          <p>
            Dengan mengirimkan laporan atau foto konservasi ke Blam, Anda memberi izin non-eksklusif kepada Blam untuk
            menampilkan materi tersebut pada peta dan daftar aksi publik demi kepentingan verifikasi dan konservasi.
          </p>
        </LegalSection>

        <LegalSection number="4" title="Relawan, Organisasi, &amp; Donasi">
          <p>
            Blam menyediakan ruang koordinasi aksi bagi relawan dan organisasi serta pencatatan kampanye donasi
            konservasi. Organisasi pengelola kampanye bertanggung jawab atas keakuratan informasi dan penyaluran dukungan
            aksi yang mereka kelola.
          </p>
        </LegalSection>

        <LegalSection number="5" title="Batasan Tanggung Jawab">
          <p>
            Layanan disediakan sebagaimana adanya (<em>as is</em>). Data citra satelit, titik panas, dan laporan
            komunitas bersifat informatif untuk koordinasi konservasi dan tidak menggantikan keputusan resmi otoritas
            berwenang di lapangan.
          </p>
        </LegalSection>

        <LegalSection number="6" title="Perubahan Ketentuan &amp; Kontak">
          <p>
            Kami dapat memperbarui ketentuan ini sewaktu-waktu sesuai perkembangan layanan. Pertanyaan terkait Ketentuan
            Layanan dapat disampaikan ke{' '}
            <a
              href="mailto:blam@gmail.com"
              className="font-semibold text-forest underline decoration-leaf/40 underline-offset-2 hover:text-ink"
            >
              blam@gmail.com
            </a>
            .
          </p>
        </LegalSection>
      </div>
    </LegalShell>
  )
}
