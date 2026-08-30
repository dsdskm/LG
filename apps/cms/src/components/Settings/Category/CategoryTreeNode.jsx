import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, IconButton } from '@repo/ui'
import { NodeRow, NodeBullet, NodeLabel, TreeBranch } from './styles'

const getNodeLabel = (node, defaultLangId, fallback) => {
  const values = Object.values(node.displayName || {})
  const preferred = defaultLangId != null ? node.displayName?.[defaultLangId]?.textScript : ''
  if (preferred && preferred.trim()) return preferred
  const firstNonEmpty = values.find((d) => (d.textScript || '').trim())
  if (firstNonEmpty) return firstNonEmpty.textScript
  if (node.categoryCode) return node.categoryCode
  return fallback
}

const CategoryTreeNode = ({
  node,
  depth,
  index,
  siblingCount,
  categoryMax,
  focusedUid,
  defaultLangId,
  onFocus,
  onAddChild,
  onDelete,
  onMove
}) => {
  const { t } = useTranslation('settings')

  const isRoot = depth === 1
  const canAddChild = depth < categoryMax
  const isUser = node.isUserCreated
  const label = getNodeLabel(node, defaultLangId, t('selectNodeToEdit'))

  return (
    <li>
      <NodeRow>
        <NodeBullet $root={isRoot} $preset={!isUser} />
        <NodeLabel
          type="button"
          $focused={focusedUid === node.uid}
          $preset={!isUser}
          $root={isRoot}
          onClick={() => onFocus(node.uid)}
        >
          {label}
        </NodeLabel>

        {isUser && (
          <>
            <IconButton
              type="button"
              name="arrow_up"
              size="xs"
              shape="square"
              theme="outlined"
              title="up"
              disabled={index === 0}
              onClick={() => onMove(node.uid, 'up')}
            />
            <IconButton
              type="button"
              name="arrow_down"
              size="xs"
              shape="square"
              theme="outlined"
              title="down"
              disabled={index === siblingCount - 1}
              onClick={() => onMove(node.uid, 'down')}
            />
          </>
        )}

        {canAddChild && (
          <Button type="button" theme="tertiary" size="sm" onClick={() => onAddChild(node.uid)}>
            + {t('addChild')}
          </Button>
        )}

        {isUser && (
          <IconButton
            type="button"
            name="close"
            size="xs"
            shape="square"
            theme="outlined"
            title={t('deleteNode')}
            onClick={() => onDelete(node.uid)}
          />
        )}
      </NodeRow>

      {node.children?.length > 0 && (
        <TreeBranch>
          {node.children.map((child, childIndex) => (
            <CategoryTreeNode
              key={child.uid}
              node={child}
              depth={depth + 1}
              index={childIndex}
              siblingCount={node.children.length}
              categoryMax={categoryMax}
              focusedUid={focusedUid}
              defaultLangId={defaultLangId}
              onFocus={onFocus}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))}
        </TreeBranch>
      )}
    </li>
  )
}

export default React.memo(CategoryTreeNode)
