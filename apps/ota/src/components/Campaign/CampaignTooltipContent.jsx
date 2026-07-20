import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipLoader } from 'react-spinners'

const CampaignInfoTooltipContent = ({ campaign, onUpdateCampaign }) => {
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation('campaign')

  useEffect(() => {
    if (!campaign) return
    if (campaign.info) {
      setInfo(campaign.info)
      return
    }

    const retrieveInfo = async () => {
      setLoading(true)
      try {
        const { Policy, preAction, postAction } = campaign
        const formatActionAsJson = (action) => {
          if (!action?.Value?.typeKeyValue || action.Value.typeKeyValue.length === 0) return 'Not set'
          const obj = {}
          action.Value.typeKeyValue.forEach((item) => {
            obj[item.key] = item.value
          })
          return JSON.stringify(obj, null, 2)
        }
        const formatPolicyAsJson = (policy) => {
          const obj = { waitTimeout: policy.waitTimeout }
          return JSON.stringify(obj, null, 2)
        }

        const infoTxt = `${t('deploymentPolicy')}\n${formatPolicyAsJson(Policy)}\n\n${t('preAction')}\n${formatActionAsJson(preAction)}\n\n${t('postAction')}\n${formatActionAsJson(postAction)}`
        setInfo(infoTxt)
        onUpdateCampaign(campaign.id, { info: infoTxt })
      } catch (err) {
        console.error(err)
        setInfo('Error loading info')
      } finally {
        setLoading(false)
      }
    }
    retrieveInfo()
  }, [campaign])

  if (!campaign) return null
  if (loading)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px', width: 'fit-content' }}>
        <ClipLoader size={20} color="#36d7b7" />
      </div>
    )
  return (
    <p
      className="tooltipDesc typographyBody6"
      style={{ whiteSpace: 'pre-wrap', width: 'fit-content', maxWidth: 'none', textAlign: 'left' }}
    >
      {info}
    </p>
  )
}

export default CampaignInfoTooltipContent
