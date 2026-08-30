import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { openForge, getForgeUrl } from '../../services/forgeApi'

const EmbedWrapper = styled.div`
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--color-secondary-20, #dadde2);
`

const Frame = styled.iframe`
  width: 100%;
  height: ${({ $height }) => $height || '80vh'};
  border: none;
  display: block;
`

const LinkCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: var(--color-neutral-10, #fff);
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 10px;
`

const LinkInfo = styled.div``

const LinkTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: var(--color-secondary-90, #262f44);
  margin-bottom: 4px;
`

const LinkDesc = styled.div`
  font-size: 13px;
  color: var(--color-secondary-50, #848c9d);
`

const OpenBtn = styled.button`
  padding: 10px 20px;
  background: #4a90d9;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: #3a7bc8;
  }
`

export function ForgeLink({ path, title, description }) {
  const { t } = useTranslation('learn')
  return (
    <LinkCard>
      <LinkInfo>
        <LinkTitle>{title || t('forgeEmbed.defaultTitle')}</LinkTitle>
        <LinkDesc>{description || t('forgeEmbed.defaultDesc')}</LinkDesc>
      </LinkInfo>
      <OpenBtn onClick={() => openForge(path)}>{t('forgeEmbed.openButton')}</OpenBtn>
    </LinkCard>
  )
}

export function ForgeEmbed({ path, height }) {
  return (
    <EmbedWrapper>
      <Frame src={getForgeUrl(path)} $height={height} title="Forge" />
    </EmbedWrapper>
  )
}

export default ForgeEmbed
