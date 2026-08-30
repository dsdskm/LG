import React, { useState, useEffect, useRef } from 'react'
import { SectionRobot as Section, Button } from '@repo/ui'
import CardConfigModal from '../modal/CardConfigModal'
import ConsoleCard from '../component/ConsoleCard'
import styled from 'styled-components'
import config from '../config'
import { getClientId } from '../config/clientId'

// 모든 styled-components 정의
const ConsoleContainer = styled.div`
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
`

const ConsoleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
`

const ConsoleTitle = styled.h2`
  margin: 0;
  color: #333;
  font-size: 24px;
`

const ConfigButton = styled.button`
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.3s ease;

  &:hover {
    background: #0056b3;
  }
`

const MIN_CARD_W = 280
const GAP = 12

const getColCount = (count) => Math.min(count, 3)

const CardsGridWrapper = styled.div`
  container-type: inline-size;
`

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, 1fr);
  gap: ${GAP}px;

  @container (max-width: ${3 * MIN_CARD_W + 2 * GAP}px) {
    grid-template-columns: repeat(${({ $cols }) => Math.min($cols, 2)}, 1fr);
  }

  @container (max-width: ${2 * MIN_CARD_W + GAP}px) {
    grid-template-columns: 1fr;
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #666;

  p {
    font-size: 18px;
    margin-bottom: 20px;
  }

  button {
    padding: 12px 24px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background 0.3s ease;

    &:hover {
      background: #0056b3;
    }
  }
`

const WebConsole = ({ t, deviceId, i18n }) => {
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [cards, setCards] = useState([])
  const cardRefs = useRef({})

  const cardTypes = {
    READONLY: {},
    CONTROL: {
      RAAT: {
        name: 'RAAT',
        path: '/',
        port: 3002,
        icon: '🛠️'
      },
      initialSetup: {
        name: 'initialSetup',
        path: '/',
        port: 18080,
        icon: '⚙️'
      }
    }
  }

  const findCardTypeDef = (targetPath) => {
    for (const [categoryKey, category] of Object.entries(cardTypes)) {
      for (const cardInfo of Object.values(category)) {
        if (cardInfo.path === targetPath) return { ...cardInfo, categoryKey }
      }
    }
    return null
  }

  useEffect(() => {
    const savedCards = localStorage.getItem(`robot-console-cards-${deviceId}`)
    if (savedCards) {
      try {
        const parsedCards = JSON.parse(savedCards)
        const validatedCards = parsedCards.map((card, index) => {
          const savedPath = card.path ?? card.targetPath ?? card.url ?? '/'
          const def = findCardTypeDef(savedPath)
          return {
            cardId: card.cardId ?? `${index + 1}`,
            cardKey: card.cardKey,
            cardName: card.name ?? card.cardName ?? card.title ?? def?.name ?? 'Unknown',
            targetPath: savedPath,
            targetPort: String(card.port ?? card.targetPort ?? def?.port ?? '3002'),
            icon: card.icon ?? def?.icon ?? '📱',
            cardType: def?.categoryKey ?? card.type ?? card.cardType ?? 'CONTROL',
            isRealtime: def?.isRealtime ?? card.isRealtime ?? false,
            realtimePort: def?.realtimePort ?? card.realtimePort ?? null,
            realtimePath: def?.realtimePath ?? card.realtimePath ?? null
          }
        })
        setCards(validatedCards)
      } catch (error) {
        console.error('Failed to parse saved cards:', error)
        setCards([])
      }
    } else {
      const defaultCards = [
        {
          cardId: '1',
          cardKey: 'RAAT',
          cardName: 'RAAT',
          path: '/',
          port: 3002,
          icon: '🛠️',
          cardType: 'CONTROL'
        }
      ]
      setCards(defaultCards)
    }
  }, [deviceId])

  useEffect(() => {
    return () => {
      console.log('RobotWebConsole unmounting — cleaning up all cards')
      Object.values(cardRefs.current).forEach((ref) => {
        if (ref?.cleanup) {
          ref.cleanup()
        }
      })
      cardRefs.current = {}
    }
  }, [])

  const handleCardConfig = (selectedCards) => {
    const cardsToSave = selectedCards.map((card, index) => {
      const targetPath = card.path || card.targetPath || card.url || '/'
      const def = findCardTypeDef(targetPath)
      return {
        cardId: `${index + 1}`,
        cardKey: card.cardKey,
        cardName: card.name || card.cardName || card.title || def?.name || 'Unknown',
        targetPath,
        targetPort: String(card.port || card.targetPort || def?.port || '3002'),
        icon: card.icon || def?.icon || '📱',
        cardType: card.type || card.cardType || def?.categoryKey || 'CONTROL',
        isRealtime: def?.isRealtime ?? card.isRealtime ?? false,
        realtimePort: def?.realtimePort ?? card.realtimePort ?? null,
        realtimePath: def?.realtimePath ?? card.realtimePath ?? null,
        path: targetPath,
        port: card.port || def?.port || 3002
      }
    })

    const newCardIds = new Set(cardsToSave.map((c) => c.cardId))
    cards.forEach((oldCard) => {
      if (!newCardIds.has(oldCard.cardId)) {
        const ref = cardRefs.current[oldCard.cardId]
        if (ref?.cleanup) {
          console.log(`Cleaning up removed card: ${oldCard.cardName}`)
          ref.cleanup()
        }
        delete cardRefs.current[oldCard.cardId]
      }
    })

    setCards(cardsToSave)
    localStorage.setItem(`robot-console-cards-${deviceId}`, JSON.stringify(cardsToSave))
    setShowConfigModal(false)
  }

  const handleCardExpand = (card) => {
    console.log('Expanding card in popup:', card)
    const cid = getClientId(deviceId, card.targetPort)
    const lang = i18n?.language || 'en-US'

    const expandUrl = `${config.proxyServerUrl}${card.targetPath}?_deviceId=${deviceId}&_port=${card.targetPort}&_cid=${cid}&mode=readonly&expanded=true&lang=${lang}`

    const expandWindow = window.open(
      expandUrl,
      `robot-expand-${deviceId}-${card.targetPath.replace(/\//g, '-')}`,
      'width=1400,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no'
    )

    if (!expandWindow) {
      alert('브라우저 팝업 차단을 해제하세요.')
      return
    }

    console.log('Expand window opened successfully')
  }

  return (
    <>
      <Section>
        <div style={{ marginBottom: '10px', minWidth: '90px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={() => setShowConfigModal(true)}>{t('cardSetting')}</Button>
        </div>
        <div>
          {cards.length === 0 ? (
            <EmptyState>
              <p>{t('noConsoleCard')}</p>
              <button onClick={() => setShowConfigModal(true)}>{t('addCard')}</button>
            </EmptyState>
          ) : (
            <CardsGridWrapper>
              <CardsGrid $cols={getColCount(cards.length)}>
                {cards.map((card) => (
                  <ConsoleCard
                    key={card.cardId}
                    robotId={deviceId}
                    card={card}
                    onExpand={handleCardExpand}
                  />
                ))}
              </CardsGrid>
            </CardsGridWrapper>
          )}
        </div>
        {showConfigModal && (
          <CardConfigModal
            isOpen={showConfigModal}
            onClose={() => setShowConfigModal(false)}
            onSave={handleCardConfig}
            cardTypes={cardTypes}
            currentCards={cards}
          />
        )}
      </Section>
    </>
  )
}

export default WebConsole
