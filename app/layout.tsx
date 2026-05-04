import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GOATED.OS 6.2',
  description: 'Sistema operacional GOATED para estoque, vendas, financeiro e integrações.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
