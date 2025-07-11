import { Suspense } from 'react';
import RulesClient from './RulesClient';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading Rules..</div>}>
      <RulesClient />
    </Suspense>
  );
}