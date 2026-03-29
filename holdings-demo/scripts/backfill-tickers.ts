import { prisma } from '../lib/prisma'

async function main() {
  const vusa = await prisma.holding.updateMany({
    where: { isin: 'IE00B3XXRP09' },
    data: { ticker: 'VUSA' }
  })
  console.log('VUSA updated:', vusa.count, 'rows')

  const eqqq = await prisma.holding.updateMany({
    where: { isin: 'IE0032077012' },
    data: { ticker: 'EQQQ' }
  })
  console.log('EQQQ updated:', eqqq.count, 'rows')

  await prisma.$disconnect()
}

main().catch(console.error)
