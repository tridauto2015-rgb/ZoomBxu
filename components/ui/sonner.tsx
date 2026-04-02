'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'dark' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast sonner-toast-unique group-[.toaster]:bg-[#1e2336]/95 group-[.toaster]:backdrop-blur-2xl group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_30px_60px_rgba(0,0,0,0.6)] group-[.toaster]:rounded-3xl group-[.toaster]:px-6 group-[.toaster]:py-5 group-[.toaster]:border-[2px]',
          description: 'group-[.toast]:text-slate-400 group-[.toast]:text-sm group-[.toast]:mt-2 group-[.toast]:font-medium group-[.toast]:leading-relaxed',
          title: 'group-[.toast]:font-black group-[.toast]:text-lg group-[.toast]:tracking-tight group-[.toast]:text-white',
          actionButton:
            'group-[.toast]:bg-[#f4a732] group-[.toast]:text-black group-[.toast]:font-black group-[.toast]:rounded-xl group-[.toast]:px-6 group-[.toast]:uppercase group-[.toast]:text-xs group-[.toast]:tracking-widest transition-transform active:scale-95',
          cancelButton:
            'group-[.toast]:bg-white/10 group-[.toast]:text-white group-[.toast]:font-bold group-[.toast]:rounded-xl group-[.toast]:px-6',
          success: 'group-[.toaster]:border-emerald-500/50 group-[.toaster]:bg-emerald-500/10 group-[.toaster]:shadow-[0_0_40px_rgba(16,185,129,0.2)]',
          error: 'group-[.toaster]:border-red-500/50 group-[.toaster]:bg-red-500/10 group-[.toaster]:shadow-[0_0_40px_rgba(239,68,68,0.2)]',
          info: 'group-[.toaster]:border-blue-500/50 group-[.toaster]:bg-blue-500/10 group-[.toaster]:shadow-[0_0_40px_rgba(59,130,246,0.2)]',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
