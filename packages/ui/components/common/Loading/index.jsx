import { MoonLoader } from 'react-spinners'

const Loading = ({ color = 'var(--t-primary-btn-bg)', size = 20, ...props }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.5rem' }}>
      <MoonLoader color={color} size={size} speedMultiplier={0.8} {...props} />
    </div>
  )
}

export default Loading
