import React, { useEffect, useReducer, useRef, useState } from 'react'
import Head from 'next/head'

export default function Home() {
  useEffect(() => {
    window.location.href = '/testgame/1'
  })
  return (
    <div className="container">
      <Head>
        <title>The Hive</title>
        <link rel="icon" href="/maskable_icon512.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#9C0464" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </Head>
      <main>
        <h1 className="title">The Hive</h1>
        <a href="/testgame/1">player 1</a> | <a href="/testgame/2">player 2</a>
      </main>
    </div>
  )
}
