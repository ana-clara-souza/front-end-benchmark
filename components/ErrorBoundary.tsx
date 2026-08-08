'use client';

// components/ErrorBoundary.tsx
//
// Sem isso, um erro de render em QUALQUER componente filho (ex: um chunk
// carregado via next/dynamic que falhou ao avaliar no navegador) sobe até
// o error boundary mais próximo — e se não houver nenhum local, isso pode
// derrubar a página inteira (ou, dependendo de como o React/Next isola o
// erro, deixar só aquele pedaço "sumido", sem nenhuma pista visível do
// motivo). Este boundary é deliberadamente burro: não tenta se recuperar,
// só troca a falha silenciosa por um retângulo visível + log no console
// com o stack real do erro.

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Rótulo curto usado no console.error, pra identificar qual boundary pegou o quê quando há mais de um na página. */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}] capturou uma falha de render:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <span style={{ fontSize: 13, color: '#dc2626' }}>⚠ Falha ao carregar (ver console)</span>
        )
      );
    }
    return this.props.children;
  }
}