// components/CardConfigModal.jsx
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { getForceConnect, setForceConnect } from '../config/forceConnect'

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const ModalContainer = styled.div`
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;

  h3 {
    margin: 0;
    color: #333;
  }
`

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;

  &:hover {
    color: #333;
  }
`

const ModalBody = styled.div`
  padding: 20px;
`

const CardTypeSection = styled.div`
  margin-bottom: 30px;

  h4 {
    margin-bottom: 15px;
    color: #333;
    padding-bottom: 8px;
    border-bottom: 1px solid #e0e0e0;
  }
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
`

const CardOption = styled.div`
  border: 2px solid ${(props) => (props.selected ? '#007bff' : '#e0e0e0')};
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${(props) => (props.selected ? '#f0f8ff' : 'white')};

  &:hover {
    border-color: #007bff;
    background: #f0f8ff;
  }
`

const CardOptionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  span.icon {
    font-size: 18px;
  }

  span.name {
    font-weight: 600;
    color: #333;
  }
`

const CardOptionPath = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
`

const CardOptionPort = styled.div`
  font-size: 11px;
  color: #999;
  font-style: italic;
`

const LiveTag = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: #155724;
  background: #d4edda;
  padding: 1px 5px;
  border-radius: 8px;
  margin-left: 4px;
  vertical-align: middle;
`

const ModalFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
`

const FooterButtons = styled.div`
  display: flex;
  gap: 10px;
`

const ForceConnectRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ForceConnectLabel = styled.span`
  font-size: 14px;
  color: #333;
`

const ToggleSwitch = styled.button`
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: ${(props) => (props.$on ? '#28a745' : '#ccc')};
  transition: background 0.3s ease;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${(props) => (props.$on ? '22px' : '2px')};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    transition: left 0.3s ease;
  }
`

const FooterButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.3s ease;

  &.btn-cancel {
    background: #6c757d;
    color: white;

    &:hover {
      background: #545b62;
    }
  }

  &.btn-save {
    background: #007bff;
    color: white;

    &:hover {
      background: #0056b3;
    }
  }
`

const CardConfigModal = ({ isOpen, onClose, onSave, cardTypes, currentCards }) => {
  const { t } = useTranslation('robot')
  const [selectedCards, setSelectedCards] = useState(new Set())
  const [forceConnect, setForceConnectState] = useState(true)

  useEffect(() => {
    if (isOpen && currentCards) {
      const currentKeys = new Set(
        currentCards.map((card) => {
          const categoryKey = card.cardType || card.type || 'CONTROL'
          return `${categoryKey}:${card.cardKey}`
        })
      )
      setSelectedCards(currentKeys)
    }
  }, [isOpen, currentCards])

  useEffect(() => {
    if (isOpen) {
      setForceConnectState(getForceConnect())
    }
  }, [isOpen])

  const handleForceConnectToggle = () => {
    const next = !forceConnect
    setForceConnectState(next)
    setForceConnect(next)
  }

  const handleCardToggle = (cardKey, categoryKey) => {
    const uniqueKey = `${categoryKey}:${cardKey}`
    const newSelected = new Set(selectedCards)
    if (newSelected.has(uniqueKey)) {
      newSelected.delete(uniqueKey)
    } else {
      newSelected.add(uniqueKey)
    }
    setSelectedCards(newSelected)
  }

  const handleSave = () => {
    const cardsToSave = []

    Object.entries(cardTypes).forEach(([categoryKey, category]) => {
      Object.entries(category).forEach(([cardKey, cardInfo]) => {
        const uniqueKey = `${categoryKey}:${cardKey}`
        if (selectedCards.has(uniqueKey)) {
          cardsToSave.push({
            cardKey,
            name: cardInfo.name,
            path: cardInfo.path,
            port: cardInfo.port,
            icon: cardInfo.icon,
            type: categoryKey,
            isRealtime: cardInfo.isRealtime || false,
            realtimePort: cardInfo.realtimePort || null,
            realtimePath: cardInfo.realtimePath || null
          })
        }
      })
    })

    onSave(cardsToSave)
  }

  if (!isOpen) return null

  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <h3>{t('consoleCardSetting')}</h3>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <ModalBody>
          {Object.entries(cardTypes).map(([categoryKey, category]) => (
            <CardTypeSection key={categoryKey}>
              <h4>{categoryKey === 'CONTROL' ? t('operable') : t('viewOnly')}</h4>
              <CardGrid>
                {Object.entries(category).map(([cardKey, cardInfo]) => (
                  <CardOption
                    key={cardKey}
                    selected={selectedCards.has(`${categoryKey}:${cardKey}`)}
                    onClick={() => handleCardToggle(cardKey, categoryKey)}
                  >
                    <CardOptionHeader>
                      <span className="icon">{cardInfo.icon}</span>
                      <span className="name">{cardInfo.name}</span>
                      {cardInfo.isRealtime && <LiveTag>LIVE</LiveTag>}
                    </CardOptionHeader>
                    <CardOptionPath>{cardInfo.path}</CardOptionPath>
                    <CardOptionPort>
                      Port: {cardInfo.port}
                      {cardInfo.isRealtime ? ` / WS: ${cardInfo.realtimePort}` : ''}
                    </CardOptionPort>
                  </CardOption>
                ))}
              </CardGrid>
            </CardTypeSection>
          ))}
        </ModalBody>

        <ModalFooter>
          <ForceConnectRow>
            <ToggleSwitch $on={forceConnect} onClick={handleForceConnectToggle} aria-pressed={forceConnect} />
            <ForceConnectLabel>{t('forceConnect')}</ForceConnectLabel>
          </ForceConnectRow>
          <FooterButtons>
            <FooterButton className="btn-cancel" onClick={onClose}>
              {t('cancel')}
            </FooterButton>
            <FooterButton className="btn-save" onClick={handleSave}>
              {t('save')}
            </FooterButton>
          </FooterButtons>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  )
}

export default CardConfigModal
