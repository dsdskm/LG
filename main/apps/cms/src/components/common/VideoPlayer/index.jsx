import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const Video = styled.video`
  width: 100%;
  height: auto;
`

const VideoPlayer = ({ file }) => {
  const { t } = useTranslation('content')

  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [file])

  return <Video ref={videoRef} src={file} controls />
}

export default VideoPlayer
