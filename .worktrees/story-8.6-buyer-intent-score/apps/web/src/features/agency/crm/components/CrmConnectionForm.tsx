'use client';

import { useState } from 'react';

interface CrmConnectionFormProps {
  onSubmit: (data: { crmType: string; apiKey: string; webhookUrl: string }) => void;
  isLoading?: boolean;
}

export function CrmConnectionForm({ onSubmit, isLoading }: CrmConnectionFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey) {
      setError('La API Key es obligatoria.');
      return;
    }

    onSubmit({
      crmType: 'inmovilla',
      apiKey,
      webhookUrl,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium text-white/80 mb-1">
          Inmovilla API Key <span className="text-red-500">*</span>
        </label>
        <input
          id="apiKey"
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Ej: inv-8f92a..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-accent-primary"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="webhookUrl" className="block text-sm font-medium text-white/80 mb-1">
          Webhook URL (Opcional)
        </label>
        <input
          id="webhookUrl"
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-accent-primary"
          disabled={isLoading}
        />
        <p className="text-xs text-white/50 mt-1">
          Solo necesario si tu configuración de Inmovilla no soporta autodiscovery.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#FF6B00] text-white font-semibold rounded-lg px-4 py-3 disabled:opacity-50"
      >
        {isLoading ? 'Conectando...' : 'Conectar Inmovilla'}
      </button>
    </form>
  );
}
