import React, { useState } from 'react'
import { Icon, Search } from '@repo/ui'
import outlinedPaths from '@repo/ui/components/common/Icon/outlinedPaths.json'
import styled from 'styled-components'

const Container = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  height: 100%;
  overflow: auto;
  background-color: #f9fafb;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background-color: #f9fafb;
  padding: 1rem 0;
  z-index: 10;
  border-bottom: 1px solid #e5e7eb;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1.5rem;
`

const IconCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: #ffffff;
    transform: translateY(-4px);
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
    border-color: #3b82f6;

    svg {
      color: #3b82f6;
    }

    span {
      color: #1e40af;
    }
  }

  svg {
    transition: color 0.2s;
    color: #4b5563;
  }

  span {
    font-size: 1.2rem;
    font-weight: 600;
    word-break: break-all;
    text-align: center;
    color: #374151;
    transition: color 0.2s;
  }
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`

const IconViewer = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const iconNames = Object.keys(outlinedPaths)

  const filteredIcons = iconNames.filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleCopy = (name) => {
    navigator.clipboard.writeText(name)
    // alert is a bit intrusive, but simple for a tool page.
    // Usually I'd use a Toast component if available.
  }

  return (
    <Container>
      <Header>
        <Title>Icon Viewer ({filteredIcons.length})</Title>
        <div style={{ width: '300px' }}>
          <Search
            placeholder="Search icons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onReset={() => setSearchTerm('')}
          />
        </div>
      </Header>
      <Grid>
        {filteredIcons.map((name) => (
          <IconCard key={name} onClick={() => handleCopy(name)} title="Click to copy name">
            <Icon name={name} size={40} />
            <span>{name}</span>
          </IconCard>
        ))}
      </Grid>
    </Container>
  )
}

export default IconViewer
