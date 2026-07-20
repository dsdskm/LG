import { APP_TABS } from '../chatSettings.constants'

export const TopTabs = ({ activeAppTab, onChange }) => {
    return (
        <div
            style={{
                display: 'flex',
                gap: '8px',
                marginTop: '4px',
                marginBottom: '20px',
                padding: '6px',
                borderRadius: '14px',
                background: '#f3f4f6',
                width: 'fit-content',
            }}
        >
            {APP_TABS.map((tab) => {
                const active = activeAppTab === tab.key

                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onChange(tab.key)}
                        style={{
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 18px',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: active ? '#ffffff' : '#374151',
                            background: active ? '#111827' : 'transparent',
                            boxShadow: active ? '0 8px 20px rgba(17, 24, 39, 0.18)' : 'none',
                        }}
                    >
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}