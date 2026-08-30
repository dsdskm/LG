import styled from 'styled-components'

/* ===== palette (공통 테마 토큰) ===== */
const ACCENT = 'var(--color-primary-70)'
const ACCENT_DARK = 'var(--color-primary-80)'
const ACCENT_SOFT = 'var(--color-primary-10)'
const BORDER = 'var(--color-secondary-20)'
const MUTED = 'var(--color-neutral-60)'
const TEXT = 'var(--color-neutral-80)'

/* ===== header ===== */
export const HeaderBar = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 2rem;
`

export const Breadcrumb = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${TEXT};

  & .sep {
    color: ${MUTED};
    margin: 0 0.6rem;
    font-weight: 400;
  }
  & .current {
    color: ${ACCENT};
  }
`

export const HeaderActions = styled.div`
  margin-left: auto;
  display: flex;
  gap: 0.8rem;
`

/* ===== two-pane cards ===== */
export const TwoPane = styled.div`
  display: flex;
  gap: 2.4rem;
  align-items: stretch;
  width: 100%;

  @media all and (max-width: 1024px) {
    flex-direction: column;
  }
`

export const Pane = styled.div`
  flex: ${(props) => props.$grow || 1};
  min-width: 0;
  background: var(--color-neutral-10);
  border: 1px solid ${BORDER};
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-00);
  padding: 2.4rem;
  min-height: 42rem;
`

export const PaneHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 1.6rem;
  font-weight: 700;
  color: ${TEXT};
  padding-bottom: 1.4rem;
  margin-bottom: 1.8rem;
  border-bottom: 1px solid ${BORDER};

  &::before {
    content: '';
    display: inline-block;
    width: 0.4rem;
    height: 1.6rem;
    border-radius: 2px;
    background: ${ACCENT};
  }
`

/* ===== tree ===== */
export const TreeRoot = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`

export const TreeBranch = styled.ul`
  list-style: none;
  margin: 0;
  padding-left: 1.8rem;
  margin-left: 0.6rem;
  border-left: 1px dashed var(--color-secondary-20);
`

export const NodeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius-md);
  transition: background 0.12s ease;

  &:hover {
    background: var(--color-neutral-15);
  }
`

export const NodeBullet = styled.span`
  flex: 0 0 auto;
  width: ${(props) => (props.$root ? '0.9rem' : '0.7rem')};
  height: ${(props) => (props.$root ? '0.9rem' : '0.7rem')};
  border-radius: 50%;
  background: ${(props) =>
    props.$preset ? 'var(--color-secondary-30)' : props.$root ? ACCENT : 'var(--color-primary-40)'};
`

export const NodeLabel = styled.button`
  flex: 1 1 auto;
  text-align: left;
  padding: 0.7rem 1rem;
  border: 1px solid ${(props) => (props.$focused ? ACCENT : 'transparent')};
  border-radius: var(--radius-md);
  background: ${(props) => (props.$focused ? ACCENT_SOFT : 'transparent')};
  font-size: 1.4rem;
  font-weight: ${(props) => (props.$root ? 600 : 400)};
  color: ${(props) => (props.$preset ? MUTED : TEXT)};
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.12s ease;

  &:hover {
    border-color: ${ACCENT};
  }
`

export const EmptyHint = styled.div`
  color: ${MUTED};
  font-size: 1.4rem;
  text-align: center;
  padding: 4rem 0;
`

/* ===== settings panel ===== */
export const SettingSection = styled.section`
  border: 1px solid ${BORDER};
  border-radius: var(--radius-lg);
  padding: 1.6rem;
  margin-bottom: 1.4rem;
  background: var(--color-secondary-10);
`

export const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.3rem;
  font-weight: 700;
  color: ${TEXT};
  margin-bottom: 1.2rem;

  &::before {
    content: '';
    width: 0.3rem;
    height: 1.2rem;
    border-radius: 2px;
    background: ${ACCENT};
  }
`

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  background: ${ACCENT_SOFT};
  color: ${ACCENT_DARK};
  font-size: 1.3rem;
  font-weight: 600;
`

export const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${BORDER};
  margin: 2rem 0;
`

export const FieldGroup = styled.div`
  margin-bottom: 1.8rem;

  & > .label {
    font-size: 1.3rem;
    font-weight: 600;
    color: ${MUTED};
    margin-bottom: 0.8rem;
  }
`

export const FieldRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1.6rem;

  & > label {
    flex: 0 0 8rem;
    font-size: 1.3rem;
    font-weight: 600;
    color: ${MUTED};
  }
`

export const InlineRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1.2rem;

  & > .lang {
    flex: 0 0 7rem;
    font-size: 1.3rem;
    color: ${TEXT};
  }
  & > div {
    flex: 1;
  }
`

export const ResolutionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: ${TEXT};
  font-size: 1.3rem;
`

export const IconPreview = styled.div`
  margin-top: 1rem;

  img {
    max-width: 12rem;
    max-height: 12rem;
    border: 1px solid ${BORDER};
    border-radius: var(--radius-md);
    object-fit: cover;
  }
`

export const ReadOnlyValue = styled.div`
  padding: 0.6rem 0;
  font-size: 1.4rem;
  color: ${TEXT};
`
