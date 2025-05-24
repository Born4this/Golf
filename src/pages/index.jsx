import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Send everyone to /auth:
    router.replace('/auth');

    // Or send logged in users to league selector
    // const token = typeof window !== 'undefined' && localStorage.getItem('token');
    // router.replace(token ? '/league-selector' : '/auth');
  }, [router]);

  return null;
}
