import NextHead from 'next/head'

import { name, icons, theme_color } from '../public/manifest.json'

export default function Head() {
  return (
    <NextHead>
      <title>{name} - Online</title>
      <link rel="icon" href={icons[0].src} />
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content={theme_color} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />
    </NextHead>
  )
}
