import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  return (
    <div className="bg-blue-50 min-h-screen p-6">
      <Component {...pageProps} />
    </div>
  );
}