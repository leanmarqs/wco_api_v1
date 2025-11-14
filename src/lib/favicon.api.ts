import { ResponseInfo } from '../types.js'

// Fetch favicons from a given URL and return ResponseInfo
export const getFavicons = async ({
  url,
  headers,
}: {
  url: string
  headers?: Headers
}): Promise<ResponseInfo> => {
  const newUrl = new URL(url) // create a URL object to extract the host

  try {
    // perform the fetch request with optional headers and redirection follow
    const response = await fetch(newUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers,
    })

    const body = await response.text()

    console.log(`response: ${body}`)
  } catch (error: any) {
    console.error(`Error fetching favicons: ${error.message}`)
  }
  return {
    url: newUrl.href,
    host: newUrl.host,
    status: 500,
    statusText: 'Failed to fetch icons',
    icons: [],
  }
}
