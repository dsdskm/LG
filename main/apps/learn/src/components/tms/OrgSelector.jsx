import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { groupApis, siteApis } from '@repo/apis'

const Wrapper = styled.div`
  margin-bottom: 20px;
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 10px;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-secondary-10, #f4f5f7);
  border-bottom: 1px solid var(--color-secondary-20, #dadde2);
`

const HeaderLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: var(--color-secondary-50, #848c9d);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const SelectedBadge = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(74, 144, 217, 0.12);
  color: #4a90d9;
  border: 1px solid rgba(74, 144, 217, 0.3);
`

const Cols = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 200px;
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  border-right: ${({ $last }) => ($last ? 'none' : '1px solid var(--color-secondary-20, #dadde2)')};
`

const ColHeader = styled.div`
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-secondary-70, #555e72);
  border-bottom: 1px solid var(--color-secondary-20, #dadde2);
`

const SearchInput = styled.input`
  margin: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-secondary-20, #dadde2);
  font-size: 13px;
  color: var(--color-secondary-90, #262f44);
  background: var(--color-neutral-10, #fff);
  outline: none;

  &:focus {
    border-color: #4a90d9;
  }
`

const ItemList = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: 180px;
`

const Item = styled.div`
  padding: 8px 12px;
  font-size: 13px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  color: ${({ $disabled }) => ($disabled ? 'var(--color-secondary-30, #c0c4cc)' : 'var(--color-secondary-90, #262f44)')};
  background: ${({ $active }) => ($active ? 'rgba(74,144,217,0.1)' : 'transparent')};
  border-left: 3px solid ${({ $active }) => ($active ? '#4a90d9' : 'transparent')};
  transition: background 0.1s;

  &:hover {
    background: ${({ $disabled, $active }) =>
      $disabled ? 'transparent' : $active ? 'rgba(74,144,217,0.14)' : 'var(--color-secondary-10, #f4f5f7)'};
  }
`

const Placeholder = styled.div`
  padding: 24px 12px;
  font-size: 12px;
  color: var(--color-secondary-30, #c0c4cc);
  text-align: center;
`

function toList(res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.content)) return res.content
  return []
}

export default function OrgSelector({ value, onChange }) {
  const { t } = useTranslation('learn')
  const [groups, setGroups] = useState([])
  const [allSites, setAllSites] = useState([])
  const [groupSearch, setGroupSearch] = useState('')
  const [siteSearch, setSiteSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState(null)

  // 그룹과 사이트를 한번에 로드하고, 사이트 필터링은 클라이언트에서 처리
  useEffect(() => {
    setLoading(true)
    Promise.all([groupApis.getGroups({}), siteApis.getSites({})])
      .then(([groupRes, siteRes]) => {
        setGroups(toList(groupRes))
        setAllSites(toList(siteRes))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleGroupSelect = (group) => {
    setSelectedGroup(group)
    setSiteSearch('')
    onChange({ groupId: group.groupId, siteId: null })
  }

  const handleSiteSelect = (site) => {
    onChange({ groupId: selectedGroup?.groupId, siteId: site.siteId })
  }

  const filteredGroups = groups.filter((g) =>
    (g.groupName ?? '').toLowerCase().includes(groupSearch.toLowerCase())
  )

  // 선택된 그룹의 사이트만 클라이언트 필터링
  const sitesForGroup = selectedGroup
    ? allSites.filter((s) => String(s.groupId) === String(selectedGroup.groupId))
    : []

  const filteredSites = sitesForGroup.filter((s) =>
    (s.siteName ?? '').toLowerCase().includes(siteSearch.toLowerCase())
  )

  const selectedSite = allSites.find((s) => String(s.siteId) === String(value?.siteId)) ?? null

  return (
    <Wrapper>
      <Header>
        <HeaderLabel>{t('orgSelector.sectionLabel')}</HeaderLabel>
        {(selectedGroup || selectedSite) && (
          <SelectedBadge>
            {selectedGroup && <Badge>🏢 {selectedGroup.groupName}</Badge>}
            {selectedSite && <Badge>📍 {selectedSite.siteName}</Badge>}
          </SelectedBadge>
        )}
      </Header>

      <Cols>
        <Col>
          <ColHeader>{t('orgSelector.groupLabel')}</ColHeader>
          <SearchInput
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
            placeholder={t('orgSelector.searchGroupPlaceholder')}
          />
          <ItemList>
            {loading ? (
              <Placeholder>{t('orgSelector.loadingGroups')}</Placeholder>
            ) : filteredGroups.length === 0 ? (
              <Placeholder>{t('orgSelector.emptyGroups')}</Placeholder>
            ) : (
              filteredGroups.map((g) => (
                <Item
                  key={g.groupId}
                  $active={selectedGroup?.groupId === g.groupId}
                  onClick={() => handleGroupSelect(g)}
                >
                  {g.groupName}
                </Item>
              ))
            )}
          </ItemList>
        </Col>

        <Col $last>
          <ColHeader>{t('orgSelector.siteLabel')}</ColHeader>
          {selectedGroup ? (
            <>
              <SearchInput
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
                placeholder={t('orgSelector.searchSitePlaceholder')}
              />
              <ItemList>
                {loading ? (
                  <Placeholder>{t('orgSelector.loadingSites')}</Placeholder>
                ) : filteredSites.length === 0 ? (
                  <Placeholder>{t('orgSelector.emptySites')}</Placeholder>
                ) : (
                  filteredSites.map((s) => (
                    <Item
                      key={s.siteId}
                      $active={String(value?.siteId) === String(s.siteId)}
                      onClick={() => handleSiteSelect(s)}
                    >
                      {s.siteName}
                    </Item>
                  ))
                )}
              </ItemList>
            </>
          ) : (
            <Placeholder>{t('orgSelector.selectGroupFirst')}</Placeholder>
          )}
        </Col>
      </Cols>
    </Wrapper>
  )
}
