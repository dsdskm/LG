import { MediaFallbackText, MediaStage, PreviewCard, PreviewHeaderTitle } from "./styles.preview"
import { PreviewProps } from "./types.preview"

export default function ObjectPreview({ node }: PreviewProps) {
    if (!node || !node.data) {
        return <></>
    }
    const data = node.data
    return (
        <PreviewCard>
            <PreviewHeaderTitle title={data.label}>
                {data.label}
            </PreviewHeaderTitle>

            <MediaStage>
                <MediaFallbackText>{data.contentName}</MediaFallbackText>
            </MediaStage>
        </PreviewCard>
    )
}