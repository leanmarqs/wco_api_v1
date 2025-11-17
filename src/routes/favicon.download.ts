import express from 'express'
import { StatusCodes, ReasonPhrases } from 'http-status-codes'
import { fetchFaviconsForDomain } from '../services/favicon.service.js'

const router = express.Router()

const log = (...msg: any[]) => console.log('[FAVICON]', ...msg)

const DOMAIN_REGEX = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/i

router.get('/:domain', async (req, res) => {
  const startTime = Date.now()
  const { domain } = req.params

  // Validate domain format
  if (!DOMAIN_REGEX.test(domain)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: ReasonPhrases.BAD_REQUEST,
      message: 'Invalid domain format.',
      domain,
    })
  }

  try {
    log(`Fetching icons for domain: ${domain}`)

    const data = await fetchFaviconsForDomain(domain)

    const duration = ((Date.now() - startTime) / 1000).toFixed(3)

    return res.status(data.status).json({
      ...data,
      duration,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    log('Unhandled router error:', err.message)

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      statusText: ReasonPhrases.INTERNAL_SERVER_ERROR,
      error: err.message,
    })
  }
})

export default router
