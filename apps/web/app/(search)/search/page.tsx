import { Suspense } from 'react';
import SearchContent from './SearchContent';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Loading search...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
