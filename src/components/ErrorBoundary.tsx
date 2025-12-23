import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] caught", { error, componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-background text-foreground">
          <section className="container max-w-2xl py-16 space-y-4">
            <header className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Erro na aplicação</h1>
              <p className="text-muted-foreground">
                Algo entrou em loop e o React interrompeu a renderização. Veja o console para o componente exato.
              </p>
            </header>
            <div className="rounded-lg border bg-card p-4 text-sm">
              <p className="font-medium">Detalhes:</p>
              <pre className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {String((this.state.error as any)?.message ?? this.state.error ?? "Erro desconhecido")}
              </pre>
            </div>
            <div className="flex gap-2">
              <button
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                onClick={() => window.location.reload()}
              >
                Recarregar
              </button>
              <a
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
                href="/"
              >
                Ir para início
              </a>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
