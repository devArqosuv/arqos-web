import { Suspense } from 'react';
import EvaluadorDashboard from './EvaluadorDashboard';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EvaluadorDashboard />
    </Suspense>
  );
}