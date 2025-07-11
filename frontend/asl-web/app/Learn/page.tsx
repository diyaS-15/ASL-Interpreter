import { Suspense } from 'react';
import LearnClient from './LearnClient';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading Game...</div>}>
      <LearnClient />
    </Suspense>
  );
}
