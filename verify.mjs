import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
const page = await browser.newPage()
const errors = []
const consoleMessages = []

page.on('console', msg => {
  consoleMessages.push(`${msg.type()}: ${msg.text()}`)
  if (msg.type() === 'error') {
    errors.push(msg.text())
  }
})

page.on('pageerror', error => {
  errors.push(error.message)
})

// Login
await page.goto('https://real-estate-admin-beryl.vercel.app/login', { waitUntil: 'networkidle' })
await page.fill('input[type="email"]', 'rafat@citywalkrealestatellc.com')
await page.fill('input[type="password"]', 'Shahood@123')
await page.click('button[type="submit"]')
await page.waitForTimeout(3000)

console.log('=== Logged in ===')

// Go to Agents tab and add new agent
await page.click('text=Agents')
await page.waitForTimeout(1000)
await page.click('text=Add New Agent')
await page.waitForTimeout(1000)

// Fill form
await page.fill('input[name="name"]', 'Test Agent')
await page.fill('input[name="email"]', 'test@agent.com')
await page.fill('input[name="phone"]', '555-1234')

// Click Create
const createButton = await page.locator('text=Create').first()
const isCreateVisible = await createButton.isVisible()
console.log('Create button visible:', isCreateVisible)

await createButton.click()
await page.waitForTimeout(5000)

console.log('\n=== After Create ===')
console.log('URL:', page.url())
console.log('JS Errors:', errors.length)
errors.forEach(e => console.log(' -', e))
console.log('Console:', consoleMessages.length)
consoleMessages.slice(-5).forEach(m => console.log(' -', m))

// Check if agent was created
const bodyText = await page.textContent('body')
console.log('Has "Test Agent":', bodyText.includes('Test Agent'))
console.log('Has credentials popup:', bodyText.includes('Agent Created') || bodyText.includes('Copy Credentials'))

// Check for "error saving" dialog
const hasError = bodyText.includes('There was an error saving')
console.log('Has error dialog:', hasError)

await browser.close()
