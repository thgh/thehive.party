import { useEffect, useState } from 'react'

export function useClientside() {
  const [state, setState] = useState({
    state: 0,
    userId: '',
    gameId: '',
  })

  useEffect(() => {
    const [gameId, userId] = window.location.pathname.split('/').filter(Boolean)
    if (gameId && userId) {
      setState({
        state: 1,
        userId,
        gameId,
      })
    } else {
      setState({
        ...state,
        state: 2,
      })
    }
  }, [])

  return state
}
