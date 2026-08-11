'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from '@/lib/toast-store';

export function AddToCartButton({ productId, stock, disabled }: { productId: string; stock: number; disabled?: boolean }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  const add = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    setState('loading');
    try {
      await api.post('/cart/items', { productId, quantity });
      window.dispatchEvent(new Event('cart:updated'));
      setState('done');
      toast({ title: 'به سبد خرید اضافه شد', description: `${quantity} عدد افزوده شد`, variant: 'success' });
      setTimeout(() => setState('idle'), 1600);
    } catch (error) {
      setState('idle');
      toast({ title: 'افزودن به سبد ناموفق بود', description: errorMessage(error), variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-3">
      {!disabled && (
        <QuantityStepper value={quantity} max={stock} onChange={setQuantity} />
      )}
      <Button onClick={add} disabled={disabled || state === 'loading'} loading={state === 'loading'} size="lg" className="flex-1">
        {state === 'done' ? (
          <>
            <Check className="h-5 w-5" /> اضافه شد
          </>
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" /> افزودن به سبد خرید
          </>
        )}
      </Button>
    </div>
  );
}
