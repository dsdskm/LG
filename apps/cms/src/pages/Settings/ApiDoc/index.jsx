import React, { useEffect, useState } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { useUserStore } from '@repo/stores'
import { swaggerApis } from '@/apis'
import { useTranslation } from 'react-i18next'

const ApiDoc = () => {
  const { session } = useUserStore()
  const { t } = useTranslation('common')
  const [swaggerDocument, setSwaggerDocument] = useState()
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    setIsError(false)
    swaggerApis
      .getSwagger()
      .then((response) => {
        setSwaggerDocument(response)
      })
      .catch((error) => {
        console.error('Failed to fetch swagger document:', error)
        setIsError(true)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const requestInterceptor = (req) => {
    // Swagger UI 'Authorize' 버튼으로 입력한 값이 없을 때만 자동 주입
    if (!req.headers['Authorization'] && session?.accessToken) {
      req.headers['Authorization'] = `Bearer ${session.accessToken}`
    }
    return req
  }

  if (isLoading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fff' }}
      >
        <div style={{ color: '#666', fontSize: '16px' }}>{t('loadingApiDoc')}</div>
      </div>
    )
  }

  if (isError || !swaggerDocument) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#fff',
          flexDirection: 'column'
        }}
      >
        <h2 style={{ color: '#333', margin: '0 0 8px 0' }}>{t('loadingFail')}</h2>
        <p style={{ color: '#666', margin: 0 }}>{t('loadingFailMsg')}</p>
      </div>
    )
  }

  return <SwaggerUI spec={swaggerDocument} requestInterceptor={requestInterceptor} />
}

export default ApiDoc
