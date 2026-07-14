import koRoute from './ko-KR/route.json'
import enRoute from './en-US/route.json'
import jaRoute from './ja-JP/route.json'
import koContent from './ko-KR/content.json'
import enContent from './en-US/content.json'
import jaContent from './ja-JP/content.json'
import koSettings from './ko-KR/settings.json'
import enSettings from './en-US/settings.json'
import jaSettings from './ja-JP/settings.json'
import koLabel from './ko-KR/label.json'
import enLabel from './en-US/label.json'
import jaLabel from './ja-JP/label.json'
import koEmbedding from './ko-KR/embedding.json'
import enEmbedding from './en-US/embedding.json'
import jaEmbedding from './ja-JP/embedding.json'

export const translations = {
  'ko-KR': {
    route: koRoute,
    content: koContent,
    settings: koSettings,
    label: koLabel,
    embedding: koEmbedding
  },
  'en-US': {
    route: enRoute,
    content: enContent,
    settings: enSettings,
    label: enLabel,
    embedding: enEmbedding
  },
  'ja-JP': {
    route: jaRoute,
    content: jaContent,
    settings: jaSettings,
    label: jaLabel,
    embedding: jaEmbedding
  }
}
