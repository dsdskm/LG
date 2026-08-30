import { useState, useEffect, useRef } from 'react'

const AudioPlayer = ({ src, language, label, playButtonText, pauseButtonText }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label style={{ minWidth: '10rem' }}>{label} : </label>
        <audio src={src} controls></audio>
      </div>
    </>
  )
}

export default AudioPlayer
