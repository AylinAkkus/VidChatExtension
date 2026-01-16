import { Box, Text, Stack, Button, Alert } from '@mantine/core'
import { useEffect, useState, useCallback } from 'react'
import { FindInputFieldsResponse } from './types'

const TabMaven = () => {
  const [inputFields, setInputFields] = useState<HTMLElement[]>([])
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const findInputFields = useCallback(() => {
    if (!currentTabId) {
      setError('No active tab found')
      return
    }

    setIsLoading(true)
    setError(null)
    chrome.tabs.sendMessage(currentTabId, { type: 'findInputFields' })
  }, [currentTabId])

  useEffect(() => {
    const handleMessage = (message: { type: string; payload?: any }) => {
      if (message.type === 'findInputFieldsResponse') {
        const data: FindInputFieldsResponse = message.payload
        setInputFields(data.inputs)
        setIsLoading(false)
      }
    }

    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        setCurrentTabId(tabs[0].id)
      } else {
        setError('No active tab found')
      }
    })

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  return (
    <Box p="md">
      <Stack gap="md">
        <Text size="lg" fw={600}>
          Hello World
        </Text>

        <Button onClick={findInputFields} loading={isLoading}>
          Find Input Fields
        </Button>

        {error && <Alert color="red">{error}</Alert>}

        {inputFields.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Found {inputFields.length} input fields:
            </Text>
            {inputFields.map((input, index) => {
              const element = input as HTMLInputElement
              const type =
                element.tagName?.toLowerCase() === 'textarea' ? 'textarea' : element.type || 'text'
              const name = element.name || 'unnamed'
              const id = element.id || 'no-id'

              return (
                <Text key={index} size="xs">
                  {index + 1}. {type} - {name} ({id})
                </Text>
              )
            })}
          </Stack>
        )}

        {inputFields.length === 0 && !isLoading && !error && (
          <Text size="sm" c="dimmed">
            No input fields found
          </Text>
        )}
      </Stack>
    </Box>
  )
}

export default TabMaven
