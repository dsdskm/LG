export function executeFrontGraphRule(parsedGraph, options = {}) {
  const { onNodeAdd, onNodeDelete, onEdgeAdd } = options
  const nodes = Array.isArray(parsedGraph?.nodes) ? parsedGraph.nodes : []
  const edges = Array.isArray(parsedGraph?.edges) ? parsedGraph.edges : []
  const operations = Array.isArray(parsedGraph?.operations) ? parsedGraph.operations : []

  const nodeLabels = nodes.map((node) => String(node?.label ?? node?.id ?? '').trim()).filter(Boolean)
  const deleteTargets = operations
    .filter((item) => item?.type === 'delete')
    .map((item) => String(item?.node ?? '').trim())
    .filter(Boolean)

  const insertAfter = nodeLabels.map((label, index) => {
    const previous = index === 0 ? '' : nodeLabels[index - 1]
    return {
      after: previous,
      step: label,
      appendOnly: index > 0,
      isolated: index === 0,
    }
  })

  const result = {
    kind: 'front-graph-rule',
    handled: true,
    nodes,
    edges,
    operations,
    deleteTargets,
    draft: {
      mode: 'edit',
      insertAfter,
    },
    actualEffect: {
      didApply: true,
      insertedNodeCount: nodeLabels.length,
      deletedNodeCount: deleteTargets.length,
      edgeCount: edges.length,
    },
  }

  if (typeof onNodeAdd === 'function') {
    for (const node of nodes) onNodeAdd(node)
  }

  if (typeof onNodeDelete === 'function') {
    for (const target of deleteTargets) onNodeDelete(target)
  }

  if (typeof onEdgeAdd === 'function') {
    for (const edge of edges) onEdgeAdd(edge)
  }

  return result
}
