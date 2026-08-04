'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function SearchForm({ initialQ }: { initialQ: string }) {
  const [q, setQ] = useState(initialQ);
  const router = useRouter();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm gap-2" role="search">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="جستجوی محصول…"
        inputMode="search"
      />
      <Button type="submit" size="icon" aria-label="جستجو">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
