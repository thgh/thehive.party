import './main.css'

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

if (
  typeof window !== 'undefined'&&
  'serviceWorker' in navigator &&
  !window.location.host.includes('localhost')
) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').then(
      function (registration) {
        console.log(
          'Service Worker registration successful with scope: ',
          registration.scope
        )
      },
      function (err) {
        console.log('Service Worker registration failed: ', err)
      }
    )
  })
}
