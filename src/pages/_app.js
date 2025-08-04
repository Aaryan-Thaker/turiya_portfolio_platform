import "@/styles/globals.css";
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const verifyRiskAssessment = async () => {
      // Skip these routes from redirection
      const exemptRoutes = [
        '/login',
        '/register',
        '/risk-assessment',
        '/verify-email',
        '/api/auth'
      ];
      
      if (exemptRoutes.some(route => router.pathname.startsWith(route))) {
        return;
      }

      try {
        // Check both localStorage and server
        const localCompleted = localStorage.getItem('riskAssessmentCompleted');
        if (localCompleted !== 'true') {
          const response = await fetch('/api/risk/check');
          const data = await response.json();
          
          if (!data.completed) {
            // Store attempted path for post-assessment redirect
            sessionStorage.setItem('preAssessmentRoute', router.asPath);
            router.push('/risk-assessment');
          } else {
            localStorage.setItem('riskAssessmentCompleted', 'true');
          }
        }
      } catch (error) {
        console.error('Risk assessment check failed:', error);
        // Continue to requested page if check fails
      }
    };

    // Handle route changes
    const handleRouteChange = () => verifyRiskAssessment();
    
    router.events.on('routeChangeStart', handleRouteChange);
    verifyRiskAssessment(); // Initial check

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);

  return <Component {...pageProps} />;
}