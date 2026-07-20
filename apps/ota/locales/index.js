import koCampaign from './ko-KR/campaign.json'
import enCampaign from './en-US/campaign.json'
import jaCampaign from './ja-JP/campaign.json'
import koArtifact from './ko-KR/artifact.json'
import enArtifact from './en-US/artifact.json'
import jaArtifact from './ja-JP/artifact.json'
import koTargetGroup from './ko-KR/targetGroup.json'
import enTargetGroup from './en-US/targetGroup.json'
import jaTargetGroup from './ja-JP/targetGroup.json'
import koManagement from './ko-KR/management.json'
import enManagement from './en-US/management.json'
import jaManagement from './ja-JP/management.json'
import koRoute from './ko-KR/route.json'
import enRoute from './en-US/route.json'
import jaRoute from './ja-JP/route.json'
import koPolicy from './ko-KR/policy.json'
import enPolicy from './en-US/policy.json'
import jaPolicy from './ja-JP/policy.json'
import koOrganization from './ko-KR/organization.json'
import enOrganization from './en-US/organization.json'
import jaOrganization from './ja-JP/organization.json'
import koDevice from './ko-KR/device.json'
import enDevice from './en-US/device.json'
import jaDevice from './ja-JP/device.json'
import koSettings from './ko-KR/settings.json'
import enSettings from './en-US/settings.json'
import jaSettings from './ja-JP/settings.json'

export const translations = {
  'ko-KR': {
    campaign: koCampaign,
    artifact: koArtifact,
    targetGroup: koTargetGroup,
    management: koManagement,
    route: koRoute,
    policy: koPolicy,
    organization: koOrganization,
    device: koDevice,
    settings: koSettings
  },
  'en-US': {
    campaign: enCampaign,
    artifact: enArtifact,
    targetGroup: enTargetGroup,
    management: enManagement,
    route: enRoute,
    policy: enPolicy,
    organization: enOrganization,
    device: enDevice,
    settings: enSettings
  },
  'ja-JP': {
    campaign: jaCampaign,
    artifact: jaArtifact,
    targetGroup: jaTargetGroup,
    management: jaManagement,
    route: jaRoute,
    policy: jaPolicy,
    organization: jaOrganization,
    device: jaDevice,
    settings: jaSettings
  }
}
