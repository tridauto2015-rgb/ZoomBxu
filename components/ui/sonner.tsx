'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast sonner-toast-unique group-[.toaster]:bg-background/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.08)] group-[.toaster]:rounded-2xl group-[.toaster]:px-5 group-[.toaster]:py-4 group-[.toaster]:border-[1.5px]',
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:text-sm group-[.toast]:mt-1.5 group-[.toast]:font-medium',
          title: 'group-[.toast]:font-black group-[.toast]:text-base group-[.toast]:tracking-tight',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-bold group-[.toast]:rounded-xl group-[.toast]:px-4',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-bold group-[.toast]:rounded-xl group-[.toast]:px-4',
          success: 'group-[.toaster]:border-green-500/20 group-[.toaster]:bg-green-500/[0.03]',
          error: 'group-[.toaster]:border-destructive/20 group-[.toaster]:bg-destructive/[0.03]',
          info: 'group-[.toaster]:border-primary/20 group-[.toaster]:bg-primary/[0.03]',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
