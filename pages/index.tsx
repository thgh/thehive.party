import React, { useEffect, useReducer, useRef, useState } from 'react'
import Head from '../components/Head'

export default function Home() {
  useEffect(() => {
    window.location.href = '/testgame/1'
  })
  return (
    <div className="container">
      <Head />
      <main>
        <h1 className="title">The Hive</h1>
        <a href="/testgame/1">player 1</a> | <a href="/testgame/2">player 2</a>
      </main>
    </div>
  )
}
