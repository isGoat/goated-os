import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GOATED.OS 6.1',
  description: 'Sistema GOATED para estoque, vendas, financeiro, BuyLab e Droper.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
