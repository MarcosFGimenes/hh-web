import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Horas-Homem | Painel de projeto',
  description: 'Acompanhamento de horas-homem para equipes terceiras com Next.js + Firebase.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
