import { useEffect, useRef, useState } from 'react'
import { Modal } from '@repo/ui'
import styled from 'styled-components'
import { Search } from 'lucide-react'
import { loadGoogleMaps } from '@/utils/googleLoader'

const SearchWrap = styled.div`
  position: relative;
`

const SearchIcon = styled.span`
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-secondary-40, #9ca3af);
  display: flex;
  align-items: center;
  pointer-events: none;
`

const SearchInput = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 2.2rem 0 0.75rem;
  border: 1px solid var(--color-secondary-20, #ddd);
  border-radius: var(--radius-xs, 4px);
  font-size: inherit;
  box-sizing: border-box;
  &:focus { outline: 2px solid var(--color-primary-40, #90c0f8); border-color: transparent; }
`

const GuideText = styled.p`
  font-size: 0.85em;
  color: var(--color-secondary-50, #999);
  margin: 0.5rem 0 0;
`

const ErrorText = styled.p`
  font-size: 0.85em;
  color: var(--color-error-60, #dc3545);
  margin: 0.5rem 0 0;
`

const getAddressComponent = (components, type, useShortName = false) => {
  const c = components?.find((c) => c.types.includes(type))
  return (useShortName ? c?.short_name : c?.long_name) ?? ''
}

// Google Places Autocomplete resolves to exactly one place on selection, so — like the
// Kakao/Daum postcode popup — picking a suggestion is enough to close and apply.
// Domestic (Korean) addresses must go through the Kakao/Daum flow instead, so a KR
// result picked here is rejected rather than passed up to the form.
const ModalGoogleAddressSearch = ({ isOpen, t, onClose, onSelect }) => {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [loadError, setLoadError] = useState(false)
  const [domesticBlocked, setDomesticBlocked] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setLoadError(false)
    setDomesticBlocked(false)
    let listener

    loadGoogleMaps()
      .then((google) => {
        if (!inputRef.current) return
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'address_components', 'geometry']
        })
        listener = autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          if (!place?.geometry?.location) return
          const components = place.address_components
          const countryCode = getAddressComponent(components, 'country', true)

          if (countryCode === 'KR') {
            setDomesticBlocked(true)
            if (inputRef.current) inputRef.current.value = ''
            return
          }
          setDomesticBlocked(false)

          onSelect({
            formattedAddress: place.formatted_address ?? '',
            postalCode: getAddressComponent(components, 'postal_code'),
            state: getAddressComponent(components, 'administrative_area_level_1'),
            city: getAddressComponent(components, 'locality') || getAddressComponent(components, 'administrative_area_level_2'),
            country: countryCode,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          })
        })
      })
      .catch((e) => {
        console.error('Google Maps load failed:', e)
        setLoadError(true)
      })

    return () => {
      listener?.remove()
      autocompleteRef.current = null
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [isOpen, onSelect])

  return (
    <Modal isOpen={isOpen} title={t('searchAddressGlobal')} onClose={onClose} closeButton size="sm">
      <SearchWrap>
        <SearchInput ref={inputRef} type="text" placeholder={t('searchAddress')} autoFocus />
        <SearchIcon><Search size={15} /></SearchIcon>
      </SearchWrap>
      {loadError && <ErrorText>{t('googleMapsLoadFailed')}</ErrorText>}
      {domesticBlocked && <ErrorText>{t('domesticAddressNotAllowedGlobal')}</ErrorText>}
      <GuideText>{t('searchAddressGlobalGuide')}</GuideText>
    </Modal>
  )
}

export default ModalGoogleAddressSearch
