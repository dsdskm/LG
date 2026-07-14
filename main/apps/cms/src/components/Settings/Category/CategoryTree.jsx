import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui'
import CategoryTreeNode from './CategoryTreeNode'
import { TreeRoot, EmptyHint } from './styles'

const CategoryTree = ({
  tree,
  categoryMax,
  focusedUid,
  defaultLangId,
  canAddRoot = false,
  onAddRoot,
  onFocus,
  onAddChild,
  onDelete,
  onMove
}) => {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')

  const isEmpty = !tree || tree.length === 0

  return (
    <div>
      {isEmpty ? (
        <EmptyHint>{tCommon('noData')}</EmptyHint>
      ) : (
        <TreeRoot>
          {tree.map((node, index) => (
            <CategoryTreeNode
              key={node.uid}
              node={node}
              depth={1}
              index={index}
              siblingCount={tree.length}
              categoryMax={categoryMax}
              focusedUid={focusedUid}
              defaultLangId={defaultLangId}
              onFocus={onFocus}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))}
        </TreeRoot>
      )}

      {canAddRoot && (
        <Button type="button" theme="tertiary" size="sm" onClick={onAddRoot} style={{ marginTop: '1rem' }}>
          + {t('addRoot', '추가')}
        </Button>
      )}
    </div>
  )
}

export default CategoryTree
