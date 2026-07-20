import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PreviewProps } from './types.preview'
import { AudioControlButton, AudioControlGroup, MediaFallbackText, MediaStage, PreviewCard, PreviewHeaderTitle } from './styles.preview'
export default function SoundPreview({ node }: PreviewProps) {
    const { t } = useTranslation('tms')
    if (!node || !node.data) {
        return <></>
    }
    const data = node.data
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const mediaUrl = ""

    return (
        <PreviewCard>
            <PreviewHeaderTitle title={data.label}>
                {data.label}
            </PreviewHeaderTitle>
            <MediaStage>
                <MediaFallbackText>{data.contentName}</MediaFallbackText>
            </MediaStage>

            <AudioControlGroup>
                <AudioControlButton
                    type="button"
                    onClick={() => {
                        void audioRef.current?.play()
                    }}
                    title={t('canvas.sound.play')}
                >
                    ▶
                </AudioControlButton>

                <AudioControlButton
                    type="button"
                    onClick={() => {
                        audioRef.current?.pause()
                    }}
                    title={t('canvas.sound.pause')}
                >
                    ❚❚
                </AudioControlButton>

                <AudioControlButton
                    type="button"
                    onClick={() => {
                        if (!audioRef.current) return
                        audioRef.current.pause()
                        audioRef.current.currentTime = 0
                    }}
                    title={t('canvas.sound.stop')}
                >
                    ■
                </AudioControlButton>
            </AudioControlGroup>

            {mediaUrl ? <audio ref={audioRef} src={mediaUrl} preload="none" /> : null}
        </PreviewCard>
    )
}
