import outlined from './outlinedPaths.json'
import filled from './filledPaths.json'

const paths = { outlined, filled }

// stroke: true 인 path 는 선(stroke) 기반 아이콘이므로 fill 대신 stroke 로 그린다
const renderPath = (key, { d, stroke } = {}, color) =>
  stroke ? (
    <path key={key} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  ) : (
    <path key={key} fillRule="evenodd" clipRule="evenodd" d={d} fill={color} />
  )

const Icon = ({ type = 'outlined', name, size = 24, color = 'currentColor' }) => {
  const path = paths[type][name]

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none">
      {Array.isArray(path)
        ? path.map((item) => renderPath(item.id, item, color))
        : renderPath(name, typeof path === 'string' ? { d: path } : path, color)}
    </svg>
  )
}

export default Icon
