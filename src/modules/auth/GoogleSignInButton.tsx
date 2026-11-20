import { useEffect, useRef } from 'react'

const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim()
export const isGoogleClientConfigured = Boolean(clientId)

interface CredentialResponse {
    credential?: string
}

interface GsiId {
    initialize: (config: {
        client_id: string
        callback: (res: CredentialResponse) => void
        use_fedcm_for_prompt?: boolean
        auto_select?: boolean
        cancel_on_tap_outside?: boolean
    }) => void
    renderButton: (
        parent: HTMLElement,
        options: {
            type?: 'standard' | 'icon'
            theme?: 'outline' | 'filled_blue' | 'filled_black'
            size?: 'large' | 'medium' | 'small'
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
            shape?: 'rectangular' | 'pill' | 'circle' | 'square'
            logo_alignment?: 'left' | 'center'
            width?: number
            locale?: string
        },
    ) => void
}

declare global {
    interface Window {
        google?: { accounts: { id: GsiId } }
    }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'
let gsiPromise: Promise<void> | null = null

function loadGsi(): Promise<void> {
    if (window.google?.accounts?.id) return Promise.resolve()
    if (gsiPromise) return gsiPromise
    gsiPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = GSI_SRC
        script.async = true
        script.defer = true
        script.onload = () => resolve()
        script.onerror = () => {
            gsiPromise = null
            reject(new Error('Gagal memuat skrip Google Sign-In'))
        }
        document.head.appendChild(script)
    })
    return gsiPromise
}

export default function GoogleSignInButton({
    onCredential,
    onError,
    disabled,
}: {
    onCredential: (idToken: string) => void | Promise<void>
    onError?: (message: string) => void
    disabled?: boolean
}) {
    const holderRef = useRef<HTMLDivElement>(null)
    // simpan callback terbaru agar tombol tidak perlu di-render ulang
    const cbRef = useRef({ onCredential, onError })
    cbRef.current = { onCredential, onError }

    useEffect(() => {
        if (!clientId) return
        let cancelled = false

        loadGsi()
            .then(() => {
                const holder = holderRef.current
                if (cancelled || !holder || !window.google) return
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (res) => {
                        if (!res.credential) {
                            cbRef.current.onError?.('Google tidak mengembalikan kredensial')
                            return
                        }
                        void cbRef.current.onCredential(res.credential)
                    },
                    use_fedcm_for_prompt: true,
                    cancel_on_tap_outside: true,
                })
                holder.innerHTML = ''
                window.google.accounts.id.renderButton(holder, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'pill',
                    logo_alignment: 'left',
                    width: Math.min(400, Math.max(200, holder.clientWidth)),
                    locale: 'id',
                })
            })
            .catch((e) => cbRef.current.onError?.(e instanceof Error ? e.message : 'Gagal memuat Google'))

        return () => {
            cancelled = true
        }
    }, [])

    return (
        <div
            ref={holderRef}
            aria-busy={disabled}
            className={`flex min-h-[44px] w-full justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        />
    )
}