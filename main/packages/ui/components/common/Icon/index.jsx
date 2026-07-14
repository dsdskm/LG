import outlined from './outlinedPaths.json'
import filled from './filledPaths.json'

const paths = { outlined, filled }

const Icon = ({ type = 'outlined', name, size = 24, color = 'currentColor' }) => {
  const path = paths[type][name]

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none">
      {Array.isArray(path) ? (
        path.map(({ id, d }) => <path key={id} fillRule="evenodd" clipRule="evenodd" d={d} fill={color} />)
      ) : (
        <path fillRule="evenodd" clipRule="evenodd" d={path} fill={color} />
      )}
    </svg>
  )
}

export default Icon
