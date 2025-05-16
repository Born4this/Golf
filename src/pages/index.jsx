import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // If you want everyone to land on /auth:
    router.replace('/auth');

    // Or send logged in users straight to league selector:
    // const token = typeof window !== 'undefined' && localStorage.getItem('token');
    // router.replace(token ? '/league-selector' : '/auth');
  }, [router]);

  return null;
}
