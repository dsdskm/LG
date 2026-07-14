import { ArrowLeft } from 'lucide-react'

type PageTitleProps = {
  title: string
  desc: string
  onBack?: () => void
}

const PageTitle = ({ title, desc, onBack }: PageTitleProps) => {
  return (
    <div
      style={{
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px'
          }}
        >
          <ArrowLeft size={20} color="#374151" />
        </button>
      )}

      <div>
        <h1
          style={{
            margin: '0 0 4px 0',
            fontSize: '30px',
            fontWeight: 'bold',
            color: '#111827',
            textAlign: 'start'
          }}
        >
          {title}
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>{desc}</p>
      </div>
    </div>
  )
}

export default PageTitle
