import { faker } from '@faker-js/faker'

// Set a fixed seed for consistent data generation
faker.seed(67890)

export const users = Array.from({ length: 500 }, () => {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  return {
    id: faker.string.uuid(),
    name: `${firstName} ${lastName}`,
    email: faker.internet.email({ firstName }).toLocaleLowerCase(),
    role: faker.helpers.arrayElement([
      'admin',
      'manager',
      'seller',
    ]) as 'admin' | 'manager' | 'seller',
    club_id: faker.helpers.maybe(() => faker.string.uuid(), { probability: 0.8 }) || null,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
  }
})
