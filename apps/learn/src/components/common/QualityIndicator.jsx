import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`

const Section = styled.div`
  background: var(--color-neutral-10, #fff);
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 10px;
  padding: 16px;
`

const SectionTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ $pro }) => ($pro ? '#51CF66' : '#FF6B6B')};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const Item = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--color-secondary-70, #555e72);
  line-height: 1.5;

  &::before {
    content: '${({ $pro }) => ($pro ? '✅' : '⚠️')}';
    flex-shrink: 0;
    margin-top: 1px;
  }
`

const Recommendation = styled.div`
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(74, 144, 217, 0.1);
  border: 1px solid rgba(74, 144, 217, 0.3);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-secondary-70, #555e72);
  line-height: 1.6;
  grid-column: 1 / -1;
`

export default function QualityIndicator({ pros, cons, recommendation }) {
  const { t } = useTranslation('learn')
  return (
    <Wrapper>
      <Section>
        <SectionTitle $pro>{t('qualityIndicator.pros')}</SectionTitle>
        {pros.map((pro, i) => (
          <Item key={i} $pro>
            {pro}
          </Item>
        ))}
      </Section>
      <Section>
        <SectionTitle>{t('qualityIndicator.cons')}</SectionTitle>
        {cons.map((con, i) => (
          <Item key={i}>{con}</Item>
        ))}
      </Section>
      {recommendation && <Recommendation>→ {recommendation}</Recommendation>}
    </Wrapper>
  )
}
