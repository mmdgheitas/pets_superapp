'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export function AddToCartButton({ productId, disabled }: { productId: string; disabled?: boolean }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const add = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    setState('loading');
    try {
      await api.post('/cart/items', { productId, quantity: 1 });
      setState('done');
      setMessage('به سبد خرید اضافه شد ✓');
      setTimeout(() => setState('idle'), 2000);
    } catch (error) {
      setState('error');
      setMessage(errorMessage(error, 'افزودن به سبد ناموفق بود'));
    }
  };

  return (
    <div className="mt-3 space-y-1">
      <Button onClick={add} disabled={disabled || state === 'loading'} size="lg" className="w-full">
        <ShoppingCart className="h-5 w-5" />
        {state === 'loading' ? 'در حال افزودن…' : 'افزودن به سبد خرید'}
      </Button>
      {message && (
        <p className={`text-sm ${state === 'error' ? 'text-destructive' : 'text-green-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
