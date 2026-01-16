import React, { useEffect, useState } from 'react'
import { Rating, Group, Text } from '@mantine/core'
import { storageGet, storageSet } from '../../utils/localStorage'
import { getI18nText } from '../../utils/i18n'

export const RATING_KEY = 'app_rating_score'

const FEEDBACK_FORM_LINK = 'https://forms.gle/<<your-uninstall-form-link>>'
const GOOD_REVIEW_LINK = 'https://chromewebstore.google.com/detail/<<your-extension-id>>/reviews'

function RatingWidget() {
  const [value, setValue] = useState<number | null>(0)

  useEffect(() => {
    storageGet(RATING_KEY, (val) => {
      if (val) {
        setValue(+val)
      }
    })
  }, [])

  const handleClick = (value: number) => {
    setValue(value)

    if (value > 3) {
      window.open(GOOD_REVIEW_LINK, '_blank', 'noreferrer')
    } else {
      window.open(FEEDBACK_FORM_LINK, '_blank', 'noreferrer')
    }

    storageSet(RATING_KEY, value)
  }

  return (
    <Group justify="center" gap="xs" pt={3}>
      <Text size="sm">{getI18nText('rateUsWidget')}</Text>
      <Rating value={value || 0} onChange={handleClick} size="sm" count={5} color="blue" />
    </Group>
  )
}

export default RatingWidget
