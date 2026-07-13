'use client';

import { useState } from 'react';
import { CrmConnectionForm } from '@/features/agency/crm/components/CrmConnectionForm';

export default function CrmSettingsPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleConnect = async (data: { crmType: string; apiKey: string; webhookUrl: string }) => {
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/v1/agency/crm/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(json.error?.message || 'Error al conectar el CRM');
      } else {
        setStatus('success');
        setMessage('¡Conexión exitosa! Importando listings...');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Error de red al intentar conectar.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 pt-12">
      <h1 className="text-3xl font-bold text-white mb-2">Integración CRM</h1>
      <p className="text-white/60 mb-8">
        Conecta tu CRM para importar automáticamente tus propiedades exclusivas a Reinder.
      </p>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Inmovilla</h2>
        
        {status === 'success' ? (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-200">
            {message}
          </div>
        ) : (
          <CrmConnectionForm onSubmit={handleConnect} isLoading={status === 'loading'} />
        )}

        {status === 'error' && (
          <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
