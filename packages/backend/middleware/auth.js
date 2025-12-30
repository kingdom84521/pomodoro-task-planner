// Mock users for development (5 users)
const MOCK_USERS = [
  {
    sub: 'mock-user-1',
    email: 'user1@test.com',
    name: 'Mock User 1',
    email_verified: true,
  },
  {
    sub: 'mock-user-2',
    email: 'user2@test.com',
    name: 'Mock User 2',
    email_verified: true,
  },
  {
    sub: 'mock-user-3',
    email: 'user3@test.com',
    name: 'Mock User 3',
    email_verified: true,
  },
  {
    sub: 'mock-user-4',
    email: 'user4@test.com',
    name: 'Mock User 4',
    email_verified: true,
  },
  {
    sub: 'mock-user-5',
    email: 'user5@test.com',
    name: 'Mock User 5',
    email_verified: true,
  },
]

const isMockAuthEnabled = process.env.MOCK_AUTH === 'true'

// JWT validation middleware (only loaded when MOCK_AUTH=false)
let realJwtCheck = null
if (!isMockAuthEnabled) {
  // Only import and configure JWT middleware in production mode
  const { auth } = await import('express-oauth2-jwt-bearer')
  realJwtCheck = auth({
    issuerBaseURL: process.env.ZITADEL_DOMAIN,
    audience: process.env.ZITADEL_AUDIENCE,
  })
}

// Mock authentication middleware (for development)
const mockJwtCheck = (req, res, next) => {
  // Get mock user ID from header (default to user 1)
  const mockUserId = req.headers['x-mock-user-id'] || '1'
  const userIndex = parseInt(mockUserId) - 1

  if (userIndex < 0 || userIndex >= MOCK_USERS.length) {
    return res.status(400).json({
      success: false,
      error: `Invalid mock user ID. Must be 1-${MOCK_USERS.length}`,
    })
  }

  // Inject mock user into req.auth (same format as real JWT)
  req.auth = MOCK_USERS[userIndex]

  next()
}

// Export the appropriate middleware based on environment
export const jwtCheck = isMockAuthEnabled ? mockJwtCheck : realJwtCheck

// Extract user information from JWT and set req.user
export const extractUserInfo = async (req, res, next) => {
  if (req.auth) {
    // In mock mode, req.auth is already set by mockJwtCheck
    // In production, req.auth contains the decoded JWT payload
    const { findOrCreateUser } = await import('../services/userService.js')

    const userInfo = {
      sub: req.auth.sub,  // Zitadel user ID or mock user ID
      email: req.auth.email,
      name: req.auth.name || req.auth.preferred_username || req.auth.email,
      email_verified: req.auth.email_verified !== undefined ? req.auth.email_verified : true,
    }

    // Find or create user in database to get the database ID
    const dbUser = await findOrCreateUser(userInfo)

    // Set req.user with both JWT info and database ID
    req.user = {
      ...userInfo,
      id: dbUser.id,  // Database user ID for querying tasks, etc.
    }
  }
  next()
}

export default {
  jwtCheck,
  extractUserInfo,
  MOCK_USERS, // Export for testing purposes
}
