import '@mantine/core/styles.css'
import { Box, Stack, MantineProvider } from '@mantine/core'
// import { getI18nText } from '../utils/i18n'
import RatingWidget from '../components/Rating/rating-widget'

import './App.css'
import TabMaven from './TabMaven/TabMaven'

const App = () => {
  return (
    <MantineProvider
      theme={{
        primaryColor: 'blue',
        defaultRadius: 'md',
      }}
    >
      <Stack style={{ height: 'calc(100vh - 10px)', padding: '0' }}>
        {/* <Text size="lg" fw={600}>{getI18nText('appName')}</Text> */}
        <TabMaven />
        <Box style={{ flexGrow: 1 }}></Box>
        <RatingWidget />
      </Stack>
    </MantineProvider>
  )
}

export default App
