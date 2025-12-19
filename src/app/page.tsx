const steps = [
  'App Router em TypeScript com CSS puro (mobile-first).',
  'SDK Firebase client para autenticação do administrador.',
  'SDK Firebase Admin nas rotas de API para operações seguras.',
  'Acesso do terceiro via /p/[folderId]?k=token validado no servidor.',
  'Validações de horas, múltiplos serviços e confirmação visual após salvar.',
];

const folders = [
  {
    title: 'Pastas de serviço',
    description:
      'Ambientes isolados com dias, funcionários, horários e O.S pré-cadastradas pelo administrador.',
  },
  {
    title: 'Links privados',
    description:
      'URL única por pasta para o terceiro, permitindo apenas lançamentos sem acesso administrativo.',
  },
  {
    title: 'Admin + Terceiro',
    description:
      'Admin autenticado via Firebase Auth; terceiro sem login, com validação de chave no servidor.',
  },
  {
    title: 'Pronto para expandir',
    description: 'Estrutura inicial preparada para fechamento e relatórios futuros.',
  },
];

const upcoming = [
  'Configurar Firebase (client + admin) e variáveis de ambiente.',
  'Modelos de dados e serviços para pastas, O.S e lançamentos.',
  'Fluxo do terceiro em /p/[folderId]?k=... com validações de horas e confirmação visual.',
  'Fluxo do administrador para criar pastas, O.S e links privados.',
];

export default function HomePage() {
  return (
    <main>
      <div className="container">
        <header className="header">
          <div className="chip-row">
            <span className="chip">Etapa 1</span>
            <span className="chip">Bootstrap</span>
            <span className="chip">Next.js App Router</span>
          </div>
          <h1 style={{ margin: 0 }}>Horas-Homem — estrutura base</h1>
          <p style={{ margin: 0, lineHeight: 1.7, color: '#475569' }}>
            Projeto mobile-first em Next.js + TypeScript + CSS puro. Firebase será usado para autenticação
            do administrador e para operações seguras via rotas de API. Terceiros lançarão horas via links
            privados, com validações automáticas e confirmação clara de salvamento.
          </p>
        </header>

        <section className="grid">
          {folders.map((folder) => (
            <article key={folder.title} className="card">
              <h3>{folder.title}</h3>
              <p>{folder.description}</p>
            </article>
          ))}
        </section>

        <section>
          <h2 style={{ marginBottom: '0.75rem' }}>Pilares funcionais</h2>
          <div className="list">
            {steps.map((step) => (
              <div key={step} className="list-item">
                {step}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ marginBottom: '0.75rem' }}>Próximos passos</h2>
          <p className="footer-note">
            Implementar os fluxos de administrador e terceiro, modelos de dados no Firestore, armazenamento de
            assinatura digital e validação integral dos horários. Esta base já está pronta para receber as
            integrações de backend (Firebase Admin) e client (Firebase SDK), além das rotas /p/[folderId]?k=... para
            os terceiros.
          </p>
          <div className="list" style={{ marginTop: '0.75rem' }}>
            {upcoming.map((item) => (
              <div key={item} className="list-item">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
