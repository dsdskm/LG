import React, { useState, useEffect } from 'react'
import JsonView from '@uiw/react-json-view'
import { vscodeTheme } from '@uiw/react-json-view/vscode'
import {
  StyledJSONEditorWrapper,
  StyledJSONEditorContainer,
  StyledJSONEditorHeader,
  StyledTabContainer,
  StyledTabButton,
  StyledEditorContent,
  StyledErrorMessage
} from './styles'

const JSONEditor = ({
  value = '',
  onChange,
  label,
  height = '30rem',
  disabled = false,
  isError = false,
  message = ''
}) => {
  const [activeTab, setActiveTab] = useState('tree') // 'tree' or 'text'
  const [jsonStr, setJsonStr] = useState('')
  const [parsedObj, setParsedObj] = useState(null)
  const [validationError, setValidationError] = useState('')

  // Sync internal string state when external value changes
  useEffect(() => {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    setJsonStr(stringValue)

    if (!stringValue.trim()) {
      setParsedObj(null)
      setValidationError('')
      return
    }

    try {
      const parsed = JSON.parse(stringValue)
      setParsedObj(parsed)
      setValidationError('')
    } catch (err) {
      setActiveTab('text')
      setParsedObj(null)
      setValidationError(err.message)
    }
  }, [value])

  // Handle manual string editing in Text Mode
  const handleTextChange = (e) => {
    const newText = e.target.value
    setJsonStr(newText)

    if (onChange) {
      onChange(newText)
    }

    if (!newText.trim()) {
      setParsedObj(null)
      setValidationError('')
      return
    }

    try {
      const parsed = JSON.parse(newText)
      setParsedObj(parsed)
      setValidationError('')
    } catch (err) {
      setParsedObj(null)
      setValidationError(err.message)
    }
  }

  // Intercept Tab key in Textarea for code-like editing
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const { selectionStart, selectionEnd } = e.target
      const newValue =
        jsonStr.substring(0, selectionStart) +
        '  ' + // 2 spaces for tab
        jsonStr.substring(selectionEnd)

      setJsonStr(newValue)
      if (onChange) {
        onChange(newValue)
      }

      // Restore cursor position
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = selectionStart + 2
      }, 0)
    }
  }

  // Handle Tab changes
  const handleTabChange = (tab) => {
    // If switching to tree mode, verify if current text is valid JSON
    if (tab === 'tree' && validationError) {
      // Keep in text mode and alert user
      return
    }
    setActiveTab(tab)
  }

  const hasError = isError || !!validationError
  const displayMessage = validationError ? `Invalid JSON: ${validationError}` : message

  return (
    <StyledJSONEditorWrapper>
      {label && <span className="label typographyBody6">{label}</span>}

      <StyledJSONEditorContainer $error={hasError}>
        <StyledJSONEditorHeader>
          <StyledTabContainer>
            <StyledTabButton
              type="button"
              $active={activeTab === 'tree'}
              disabled={!!validationError}
              onClick={() => handleTabChange('tree')}
            >
              Tree View
            </StyledTabButton>
            <StyledTabButton type="button" $active={activeTab === 'text'} onClick={() => handleTabChange('text')}>
              Raw Text
            </StyledTabButton>
          </StyledTabContainer>
        </StyledJSONEditorHeader>

        <StyledEditorContent $height={height}>
          {activeTab === 'tree' && parsedObj ? (
            <JsonView
              value={parsedObj}
              style={vscodeTheme}
              displayDataTypes={false}
              displayObjectSize={true}
              enableClipboard={true}
            />
          ) : (
            <textarea
              value={jsonStr}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="{}"
              spellCheck={false}
            />
          )}
        </StyledEditorContent>
      </StyledJSONEditorContainer>

      {displayMessage && <StyledErrorMessage>{displayMessage}</StyledErrorMessage>}
    </StyledJSONEditorWrapper>
  )
}

export default JSONEditor
