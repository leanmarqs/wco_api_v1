import express from 'express'
import { getFavicons } from '../lib/favicon.api.js'
import { ResponseInfo } from '../types.js'

const router = express.Router()

router.get('/:domain', async (req, res) => {
  const startTime = Date.now()
  const { domain } = req.params

  // Validate domain name format
  if (!/([a-z0-9-]+\.)+[a-z0-9]{1,}$/.test(domain)) {
    res.status(400).json({
      error: `Invalid domain name format.`,
      domain: `${domain}`,
    })
  }

  // Define a helper function to handle the response
  const handleResponse = (data: ResponseInfo, status: number, statusText: string) => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(3)

    res.status(status).json(data).send(statusText)
  }

  // Fetch favicon using HTTP
  const data: ResponseInfo = { url: '', host: '', status: 500, statusText: '', icons: [] }
  const url = `http://${domain}`

  try {
    const data = await getFavicons({ url })

    if (data.status === 530) return handleResponse(data, 530, 'Error 530')
    if (data.icons.length > 0) return handleResponse(data, 200, 'OK')
  } catch (error: any) {
    console.error('Error fetching HTTP favicons: ', error.message)
  }

  const icons: { href: string; sizes?: string }[] = []
  const duration = ((Date.now() - startTime) / 1000).toFixed(3)

  res.status(200).json({
    url,
    host: new URL(url).host,
    status: 200,
    statusText: 'OK',
    duration: `${duration}`,
    icons,
  })
})

export default router
