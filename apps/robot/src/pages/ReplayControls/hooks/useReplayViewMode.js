// /hooks/useReplayViewMode.js
import { useCallback, useState } from 'react'

export default function useReplayViewMode(initial = 'landing') {
  const [viewMode, setViewMode] = useState(initial) // 'landing' | 'result'
  const [resultData, setResultData] = useState(null) // mock sample result

  const createMockResult = () => ({
    system: { cpu: '43%', fps: 58, state: 'RUN' },
    joints: [
      { name: 'L1', value: 72 },
      { name: 'L2', value: 68 },
      { name: 'L3', value: 55 },
      { name: 'L4', value: 61 },
      { name: 'L5', value: 47 }
    ],
    events: [
      { t: '00:42', level: 'WARN', message: 'Temp rising' },
      { t: '02:20', level: 'ERROR', message: 'Controller timeout' },
      { t: '03:10', level: 'INFO', message: 'Recovered' },
      { t: '06:50', level: 'WARN', message: 'Slip detected' }
    ]
  })

  const onQuery = useCallback(() => {
    setViewMode('result')
    setResultData(createMockResult())
  }, [])

  const goLanding = useCallback(() => {
    setViewMode('landing')
    setResultData(null)
  }, [])

  return { viewMode, resultData, onQuery, goLanding }
}
