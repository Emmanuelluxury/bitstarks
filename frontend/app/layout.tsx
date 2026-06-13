import { TransactionProvider } from './components/TransactionContext'
import FloatingDots from './components/FloatingDots'

export const metadata = {
  title: 'BitStark  | Bitcoin to StarkNet Bridge',
  description: 'The most secure, fast, and cost-effective way to transfer your Bitcoin assets to StarkNet',
  icons: {
    icon: '/images/image.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <FloatingDots />
        <TransactionProvider>
          {children}
        </TransactionProvider>
      </body>
    </html>
  )
}