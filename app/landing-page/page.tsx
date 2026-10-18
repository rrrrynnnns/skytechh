'use client';

import { useRouter } from 'next/navigation';
import { LandingPage } from '@/app/components/LandingPage';

export default function LandingPageRoute() {
  const router = useRouter();
  return <LandingPage onLogin={() => router.push('/login')} onBook={() => router.push('/booking')} />;
}
